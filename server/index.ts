import 'dotenv/config';
import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import express, { NextFunction, Request, Response } from 'express';
import initSqlJs from 'sql.js';
import type { Database as SqlJsDatabase, SqlValue } from 'sql.js';
import { DEFAULT_FARMER_USER, DEFAULT_OWNER_USER, INITIAL_BOOKINGS, INITIAL_EQUIPMENT, INITIAL_RENTAL_REQUESTS } from '../src/data/mockData';
import { ActivityLogItem, Booking, Equipment, RentalRequest, User } from '../src/types';
import { calculateBookingPricing, calculateDateDiffDays } from '../src/utils/formatters';
import { formatAndValidateNigerianPhone } from '../src/utils/security';
import { DEFAULT_EQUIPMENT_IMAGE, EQUIPMENT_IMAGE_URL_PREFIX } from '../src/utils/equipmentImages';

const scrypt = promisify(scryptCallback);
const port = Number(process.env.PORT || 3101);
const sessionLifetimeSeconds = 60 * 60 * 24 * 7;
const cookieName = 'agrirent_session';
const adminCookieName = 'agrirent_admin_session';
const databasePath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'agrirent.sqlite');

if (databasePath !== ':memory:') {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

const require = createRequire(import.meta.url);
const sqlJsDirectory = path.dirname(require.resolve('sql.js'));
const SQL = await initSqlJs({ locateFile: filename => path.join(sqlJsDirectory, filename) });
const initialDatabase = databasePath !== ':memory:' && fs.existsSync(databasePath)
  ? new Uint8Array(fs.readFileSync(databasePath))
  : undefined;

class SqliteStore {
  private inTransaction = false;

  constructor(private readonly database: SqlJsDatabase, private readonly filePath: string) {}

  exec(sql: string): void {
    this.database.run(sql);
    this.persist();
  }

  pragma(setting: string): void {
    this.database.run(`PRAGMA ${setting}`);
  }

  prepare(sql: string) {
    return {
      run: (...params: unknown[]) => {
        const statement = this.database.prepare(sql);
        try {
          statement.run(params as SqlValue[]);
          if (!this.inTransaction) this.persist();
        } finally {
          statement.free();
        }
      },
      get: (...params: unknown[]) => {
        const statement = this.database.prepare(sql);
        try {
          statement.bind(params as SqlValue[]);
          return statement.step() ? statement.getAsObject() : undefined;
        } finally {
          statement.free();
        }
      },
      all: (...params: unknown[]) => {
        const statement = this.database.prepare(sql);
        try {
          statement.bind(params as SqlValue[]);
          const rows: Array<Record<string, SqlValue>> = [];
          while (statement.step()) rows.push(statement.getAsObject());
          return rows;
        } finally {
          statement.free();
        }
      },
    };
  }

  transaction<T>(callback: () => T): () => T {
    return () => {
      this.database.run('BEGIN');
      this.inTransaction = true;
      try {
        const result = callback();
        this.database.run('COMMIT');
        this.inTransaction = false;
        this.persist();
        return result;
      } catch (error) {
        this.database.run('ROLLBACK');
        this.inTransaction = false;
        throw error;
      }
    };
  }

  private persist(): void {
    if (this.filePath === ':memory:' || this.inTransaction) return;
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    fs.writeFileSync(temporaryPath, this.database.export());
    if (fs.existsSync(this.filePath)) {
      fs.unlinkSync(this.filePath);
    }
    fs.renameSync(temporaryPath, this.filePath);
  }
}

const db = new SqliteStore(new SQL.Database(initialDatabase), databasePath);
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS equipment (
    id TEXT PRIMARY KEY,
    owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS rental_requests (
    id TEXT PRIMARY KEY,
    owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_login_at TEXT
  );
  CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

type UserRow = {
  id: string;
  email: string;
  password_salt: string;
  password_hash: string;
  data: string;
};

type AuthRequest = Request & { user?: User };
type AdminRole = 'support' | 'operations' | 'finance' | 'superadmin';
type AdminRecord = { id: string; email: string; name: string; role: AdminRole };
type AdminRequest = AuthRequest & { admin?: AdminRecord };
const equipmentCategories: Equipment['category'][] = ['Tractors', 'Harvesters', 'Irrigation', 'Tillers', 'Planters', 'Trailers', 'Ploughs', 'Sprayers', 'Seeders', 'Threshers', 'Balers', 'Cultivators', 'Shellers'];
const availabilityStatuses: Equipment['availability'][] = ['Available', 'Active rental', 'Maintenance'];

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function isValidEquipmentImageUrl(value: unknown): value is string {
  return typeof value === 'string' && (
    (value.startsWith(EQUIPMENT_IMAGE_URL_PREFIX) && value.length <= 200)
    || (value.startsWith('data:image/') && value.length <= 1_500_000)
  );
}

function migrateLegacyImagePaths(): void {
  const legacyPrefix = '/src/assets/images/';
  const toPublicImageUrl = (imageUrl: string) => {
    if (!imageUrl.startsWith(legacyPrefix)) return imageUrl;
    const filename = imageUrl.slice(legacyPrefix.length);
    if (path.basename(filename) !== filename
      || !fs.existsSync(path.join(process.cwd(), 'public', 'assets', 'equipment', filename))) {
      return DEFAULT_EQUIPMENT_IMAGE;
    }
    return `${EQUIPMENT_IMAGE_URL_PREFIX}${filename}`;
  };
  const equipmentRows = db.prepare('SELECT id, data FROM equipment').all() as Array<{ id: string; data: string }>;
  const bookingRows = db.prepare('SELECT id, data FROM bookings').all() as Array<{ id: string; data: string }>;
  const updateEquipment = db.prepare('UPDATE equipment SET data = ? WHERE id = ?');
  const updateBooking = db.prepare('UPDATE bookings SET data = ? WHERE id = ?');
  db.transaction(() => {
    for (const row of equipmentRows) {
      const equipment = parseJson<Equipment>(row.data);
      const imageUrl = toPublicImageUrl(equipment.imageUrl);
      if (imageUrl !== equipment.imageUrl) {
        updateEquipment.run(JSON.stringify({ ...equipment, imageUrl }), row.id);
      }
    }
    for (const row of bookingRows) {
      const booking = parseJson<Booking>(row.data);
      const equipmentImage = toPublicImageUrl(booking.equipmentImage);
      if (equipmentImage !== booking.equipmentImage) {
        updateBooking.run(JSON.stringify({ ...booking, equipmentImage }), row.id);
      }
    }
  })();
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function getAdminById(id: string): AdminRecord | undefined {
  const row = db.prepare('SELECT id, email, name, role FROM admin_users WHERE id = ?').get(id) as
    { id: string; email: string; name: string; role: AdminRole } | undefined;
  return row;
}

function addAdminAudit(adminId: string, action: string, targetType: string, targetId: string | null, details: string): void {
  db.prepare('INSERT INTO admin_audit_logs (id, admin_id, action, target_type, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(`adm-audit-${Date.now()}-${randomBytes(3).toString('hex')}`, adminId, action.slice(0, 100), targetType.slice(0, 50), targetId, details.slice(0, 1000), new Date().toISOString());
}

function getUserById(id: string): User | undefined {
  const row = db.prepare('SELECT data FROM users WHERE id = ?').get(id) as { data: string } | undefined;
  if (!row) return undefined;
  const user = parseJson<User>(row.data);
  return { ...user, isDemo: user.isDemo ?? (user.id === DEFAULT_FARMER_USER.id || user.id === DEFAULT_OWNER_USER.id) };
}

function addActivity(userId: string | null, entry: Omit<ActivityLogItem, 'id' | 'timestamp'> & { timestamp?: string }): ActivityLogItem {
  const activity: ActivityLogItem = {
    id: `act-${Date.now()}-${randomBytes(3).toString('hex')}`,
    timestamp: entry.timestamp || 'Just now',
    ...entry,
  };
  db.prepare('INSERT INTO activity_logs (id, user_id, data, created_at) VALUES (?, ?, ?, ?)')
    .run(activity.id, userId, JSON.stringify(activity), new Date().toISOString());
  db.prepare(`
    DELETE FROM activity_logs
    WHERE id NOT IN (SELECT id FROM activity_logs ORDER BY created_at DESC LIMIT 50)
  `).run();
  return activity;
}

async function passwordDigest(password: string, salt: string): Promise<Buffer> {
  return (await scrypt(password, salt, 64)) as Buffer;
}

async function initializeDemoData(): Promise<void> {
  const shouldSeedUsers = process.env.NODE_ENV !== 'production' || process.env.SEED_DEMO_USERS === 'true';
  const userCount = (db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count;
  if (shouldSeedUsers && userCount === 0) {
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (id, email, password_salt, password_hash, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const demos: Array<{ user: User; password: string }> = [
      { user: DEFAULT_FARMER_USER, password: 'AgriRent2026!' },
      { user: DEFAULT_OWNER_USER, password: 'FleetMaster#2026' },
    ];
    for (const demo of demos) {
      const salt = randomBytes(16).toString('hex');
      const digest = await passwordDigest(demo.password, salt);
      const user = demo.user;
      insertUser.run(user.id, user.email, salt, digest.toString('hex'), JSON.stringify(user), new Date().toISOString());
    }
  }

  const insertEquipment = db.prepare('INSERT OR IGNORE INTO equipment (id, owner_id, data) VALUES (?, ?, ?)');
  for (const item of INITIAL_EQUIPMENT) {
    const ownerExists = db.prepare('SELECT id FROM users WHERE id = ?').get(DEFAULT_OWNER_USER.id);
    const ownerId = item.ownerName.includes(DEFAULT_OWNER_USER.name) && ownerExists ? DEFAULT_OWNER_USER.id : null;
    insertEquipment.run(item.id, ownerId, JSON.stringify(item));
  }

  const insertRequest = db.prepare('INSERT OR IGNORE INTO rental_requests (id, owner_id, data) VALUES (?, ?, ?)');
  for (const request of INITIAL_RENTAL_REQUESTS) {
    const equipment = db.prepare('SELECT owner_id FROM equipment WHERE id = ?').get(request.equipmentId) as { owner_id: string | null } | undefined;
    insertRequest.run(request.id, equipment?.owner_id || null, JSON.stringify(request));
  }

  const demoFarmer = db.prepare('SELECT id FROM users WHERE id = ?').get(DEFAULT_FARMER_USER.id);
  if (demoFarmer) {
    const insertBooking = db.prepare('INSERT OR IGNORE INTO bookings (id, user_id, data, created_at) VALUES (?, ?, ?, ?)');
    const updateBooking = db.prepare('UPDATE bookings SET data = ? WHERE id = ?');
    for (const booking of INITIAL_BOOKINGS) {
      const demoBooking: Booking = {
        ...booking,
        status: 'Pending Approval',
        demoReference: `DEMO-SAMPLE-${booking.id}`,
      };
      insertBooking.run(demoBooking.id, DEFAULT_FARMER_USER.id, JSON.stringify(demoBooking), demoBooking.createdAt);
      updateBooking.run(JSON.stringify(demoBooking), demoBooking.id);
    }
  }
}

async function initializeAdminAccount(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  if (!isValidEmail(email) || password.length < 12) {
    throw new Error('ADMIN_EMAIL must be valid and ADMIN_PASSWORD must be at least 12 characters.');
  }
  const existing = db.prepare('SELECT id FROM admin_users WHERE email = ? COLLATE NOCASE').get(email);
  if (existing) return;
  const salt = randomBytes(16).toString('hex');
  const digest = await passwordDigest(password, salt);
  db.prepare('INSERT INTO admin_users (id, email, name, role, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(`adm-${randomBytes(12).toString('hex')}`, email, process.env.ADMIN_NAME?.trim().slice(0, 100) || 'Platform Administrator', 'superadmin', salt, digest.toString('hex'), new Date().toISOString());
}

function getSessionToken(req: Request): string | undefined {
  const cookie = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`));
  return cookie?.slice(cookieName.length + 1);
}

function setSessionCookie(res: Response, token: string): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${cookieName}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${sessionLifetimeSeconds}${secure}`);
}

function clearSessionCookie(res: Response): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`);
}

function getAdminSessionToken(req: Request): string | undefined {
  const cookie = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${adminCookieName}=`));
  return cookie?.slice(adminCookieName.length + 1);
}

function setAdminSessionCookie(res: Response, token: string): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${adminCookieName}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${60 * 60 * 4}${secure}`);
}

function clearAdminSessionCookie(res: Response): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${adminCookieName}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${secure}`);
}

const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
app.use(express.json({ limit: '2mb' }));
app.use((req: AuthRequest, _res, next) => {
  const token = getSessionToken(req);
  if (token) {
    const session = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?').get(hashToken(token)) as
      { user_id: string; expires_at: number } | undefined;
    if (session && session.expires_at > Date.now()) {
      req.user = getUserById(session.user_id);
    } else if (session) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
    }
  }
  const adminToken = getAdminSessionToken(req);
  if (adminToken) {
    const session = db.prepare('SELECT admin_id, expires_at FROM admin_sessions WHERE token_hash = ?').get(hashToken(adminToken)) as
      { admin_id: string; expires_at: number } | undefined;
    if (session && session.expires_at > Date.now()) {
      (req as AdminRequest).admin = getAdminById(session.admin_id);
    } else if (session) {
      db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(hashToken(adminToken));
    }
  }
  next();
});

function requireUser(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Please sign in to continue.' });
    return;
  }
  next();
}

function requireAdmin(req: AdminRequest, res: Response, next: NextFunction): void {
  if (!req.admin) {
    res.status(401).json({ error: 'Admin authentication is required.' });
    return;
  }
  next();
}

function requireAdminRole(...roles: AdminRole[]) {
  return (req: AdminRequest, res: Response, next: NextFunction): void => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      res.status(403).json({ error: 'You do not have permission for this admin action.' });
      return;
    }
    next();
  };
}

function asyncRoute(handler: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req as AuthRequest, res).catch(next);
  };
}

function asyncAdminRoute(handler: (req: AdminRequest, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req as AdminRequest, res).catch(next);
  };
}

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function publicStats() {
  return {
    users: (db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count,
    equipment: (db.prepare('SELECT COUNT(*) AS count FROM equipment').get() as { count: number }).count,
    bookings: (db.prepare('SELECT COUNT(*) AS count FROM bookings').get() as { count: number }).count,
    rentalRequests: (db.prepare('SELECT COUNT(*) AS count FROM rental_requests').get() as { count: number }).count,
    activities: (db.prepare('SELECT COUNT(*) AS count FROM activity_logs').get() as { count: number }).count,
  };
}

const adminLoginAttempts = new Map<string, { count: number; resetAt: number }>();

app.post('/api/admin/auth/login', asyncRoute(async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const attemptKey = `${req.ip}:${email}`;
  const now = Date.now();
  const attempt = adminLoginAttempts.get(attemptKey);
  if (attempt && attempt.resetAt > now && attempt.count >= 5) {
    res.status(429).json({ error: 'Too many admin sign-in attempts. Try again later.' });
    return;
  }
  if (attempt && attempt.resetAt <= now) adminLoginAttempts.delete(attemptKey);
  const row = db.prepare('SELECT id, email, name, role, password_salt, password_hash FROM admin_users WHERE email = ? COLLATE NOCASE')
    .get(email) as { id: string; email: string; name: string; role: AdminRole; password_salt: string; password_hash: string } | undefined;
  if (!row || !password) {
    const current = adminLoginAttempts.get(attemptKey);
    adminLoginAttempts.set(attemptKey, { count: (current?.count || 0) + 1, resetAt: current?.resetAt || now + 15 * 60 * 1000 });
    res.status(401).json({ error: 'Admin email or password is incorrect.' });
    return;
  }
  const digest = await passwordDigest(password, row.password_salt);
  if (!timingSafeEqual(digest, Buffer.from(row.password_hash, 'hex'))) {
    const current = adminLoginAttempts.get(attemptKey);
    adminLoginAttempts.set(attemptKey, { count: (current?.count || 0) + 1, resetAt: current?.resetAt || now + 15 * 60 * 1000 });
    res.status(401).json({ error: 'Admin email or password is incorrect.' });
    return;
  }
  adminLoginAttempts.delete(attemptKey);
  const token = randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO admin_sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)')
    .run(hashToken(token), row.id, Date.now() + 60 * 60 * 4 * 1000);
  db.prepare('UPDATE admin_users SET last_login_at = ? WHERE id = ?').run(new Date().toISOString(), row.id);
  addAdminAudit(row.id, 'Admin signed in', 'admin_session', row.id, 'Successful admin authentication.');
  setAdminSessionCookie(res, token);
  res.json({ admin: { id: row.id, email: row.email, name: row.name, role: row.role } });
}));

app.post('/api/admin/auth/logout', (req: AdminRequest, res) => {
  const token = getAdminSessionToken(req);
  if (token) db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(hashToken(token));
  if (req.admin) addAdminAudit(req.admin.id, 'Admin signed out', 'admin_session', req.admin.id, 'Admin session terminated.');
  clearAdminSessionCookie(res);
  res.status(204).end();
});

app.get('/api/admin/bootstrap', requireAdmin, (req: AdminRequest, res) => {
  const users = (db.prepare('SELECT data, created_at FROM users ORDER BY created_at DESC LIMIT 100').all() as Array<{ data: string; created_at: string }>).map(row => {
    const user = parseJson<User>(row.data);
    return { id: user.id, name: user.name, email: user.email, role: user.role, location: user.location, verified: user.verified, createdAt: row.created_at };
  });
  const audits = db.prepare(`
    SELECT audit.id, audit.action, audit.target_type AS targetType, audit.target_id AS targetId,
      audit.details, audit.created_at AS createdAt, admins.email AS adminEmail
    FROM admin_audit_logs audit JOIN admin_users admins ON admins.id = audit.admin_id
    ORDER BY audit.created_at DESC LIMIT 50
  `).all();
  const equipment = (db.prepare('SELECT id, owner_id, data FROM equipment ORDER BY rowid DESC LIMIT 200').all() as Array<{ id: string; owner_id: string | null; data: string }>).map(row => ({
    ...parseJson<Equipment>(row.data),
    ownerId: row.owner_id,
  }));
  addAdminAudit(req.admin!.id, 'Viewed admin overview', 'system', null, 'Loaded users, platform statistics, and audit activity.');
  res.json({ admin: req.admin, stats: publicStats(), users, equipment, audits });
});

app.get('/api/admin/audit-logs', requireAdmin, (req: AdminRequest, res) => {
  const audits = db.prepare(`
    SELECT audit.id, audit.action, audit.target_type AS targetType, audit.target_id AS targetId,
      audit.details, audit.created_at AS createdAt, admins.email AS adminEmail
    FROM admin_audit_logs audit JOIN admin_users admins ON admins.id = audit.admin_id
    ORDER BY audit.created_at DESC LIMIT 200
  `).all();
  addAdminAudit(req.admin!.id, 'Viewed audit log', 'audit_log', null, 'Loaded administrative audit events.');
  res.json(audits);
});

app.post('/api/admin/users', requireAdminRole('superadmin'), asyncAdminRoute(async (req, res) => {
  const { name, email, phone, password, role, location, state, lga, farmSizeHectares, fleetCount } = req.body ?? {};
  if (typeof name !== 'string' || name.trim().length < 2 || !isValidEmail(email)
    || typeof password !== 'string' || password.length < 8 || password.length > 128
    || (role !== 'farmer' && role !== 'owner')) {
    res.status(400).json({ error: 'Provide a valid name, email, role, and password.' });
    return;
  }
  const phoneResult = typeof phone === 'string' ? formatAndValidateNigerianPhone(phone) : null;
  if (!phoneResult?.isValid) {
    res.status(400).json({ error: phoneResult?.error || 'Enter a valid Nigerian phone number.' });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(normalizedEmail)) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }
  const user: User = {
    id: `usr-${randomBytes(12).toString('hex')}`,
    name: name.trim().slice(0, 100),
    phone: phoneResult.formatted,
    email: normalizedEmail,
    role,
    location: typeof location === 'string' ? location.trim().slice(0, 300) : '',
    state: typeof state === 'string' ? state.trim().slice(0, 80) : undefined,
    lga: typeof lga === 'string' ? lga.trim().slice(0, 100) : undefined,
    farmSizeHectares: role === 'farmer' ? Number(farmSizeHectares) || undefined : undefined,
    fleetCount: role === 'owner' ? Number(fleetCount) || undefined : undefined,
    verified: false,
    savedEquipmentIds: [],
    hasDualRole: false,
    isDemo: false,
    onboardingCompleted: false,
  };
  const salt = randomBytes(16).toString('hex');
  const digest = await passwordDigest(password, salt);
  db.prepare('INSERT INTO users (id, email, password_salt, password_hash, data, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(user.id, user.email, salt, digest.toString('hex'), JSON.stringify(user), new Date().toISOString());
  addAdminAudit(req.admin!.id, 'Created user account', 'user', user.id, `${user.email} (${user.role})`);
  res.status(201).json(user);
}));

app.patch('/api/admin/users/:id', requireAdminRole('superadmin'), asyncAdminRoute(async (req, res) => {
  const row = db.prepare('SELECT data FROM users WHERE id = ?').get(req.params.id) as { data: string } | undefined;
  if (!row) {
    res.status(404).json({ error: 'User was not found.' });
    return;
  }
  const current = parseJson<User>(row.data);
  const input = req.body ?? {};
  const nextEmail = typeof input.email === 'string' ? input.email.trim().toLowerCase() : current.email;
  const nextRole = input.role === 'farmer' || input.role === 'owner' ? input.role : current.role;
  if (!isValidEmail(nextEmail) || typeof input.name !== 'string' || input.name.trim().length < 2
    || (typeof input.phone === 'string' && !formatAndValidateNigerianPhone(input.phone)?.isValid)) {
    res.status(400).json({ error: 'Provide a valid name, email, and Nigerian phone number.' });
    return;
  }
  const duplicate = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id != ?').get(nextEmail, req.params.id);
  if (duplicate) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }
  const updated: User = {
    ...current,
    name: input.name.trim().slice(0, 100),
    email: nextEmail,
    phone: typeof input.phone === 'string' ? formatAndValidateNigerianPhone(input.phone)!.formatted : current.phone,
    role: nextRole,
    location: typeof input.location === 'string' ? input.location.trim().slice(0, 300) : current.location,
    state: typeof input.state === 'string' ? input.state.trim().slice(0, 80) : current.state,
    lga: typeof input.lga === 'string' ? input.lga.trim().slice(0, 100) : current.lga,
    farmSizeHectares: nextRole === 'farmer' ? Number(input.farmSizeHectares) || undefined : undefined,
    fleetCount: nextRole === 'owner' ? Number(input.fleetCount) || undefined : undefined,
    verified: typeof input.verified === 'boolean' ? input.verified : current.verified,
    hasDualRole: typeof input.hasDualRole === 'boolean' ? input.hasDualRole : current.hasDualRole,
  };
  try {
    db.prepare('UPDATE users SET email = ?, data = ? WHERE id = ?').run(updated.email, JSON.stringify(updated), req.params.id);
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    throw error;
  }
  if (updated.name !== current.name) {
    const owned = db.prepare('SELECT id, data FROM equipment WHERE owner_id = ?').all(req.params.id) as Array<{ id: string; data: string }>;
    for (const equipmentRow of owned) {
      const equipment = parseJson<Equipment>(equipmentRow.data);
      db.prepare('UPDATE equipment SET data = ? WHERE id = ?').run(JSON.stringify({ ...equipment, ownerName: updated.name }), equipmentRow.id);
    }
  }
  if (typeof input.password === 'string' && input.password.length >= 8 && input.password.length <= 128) {
    const salt = randomBytes(16).toString('hex');
    const digest = await passwordDigest(input.password, salt);
    db.prepare('UPDATE users SET password_salt = ?, password_hash = ? WHERE id = ?').run(salt, digest.toString('hex'), req.params.id);
  }
  addAdminAudit(req.admin!.id, 'Updated user account', 'user', updated.id, `${updated.email} (${updated.role})`);
  res.json(updated);
}));

app.delete('/api/admin/users/:id', requireAdminRole('superadmin'), (req: AdminRequest, res) => {
  const row = db.prepare('SELECT data FROM users WHERE id = ?').get(req.params.id) as { data: string } | undefined;
  if (!row) {
    res.status(404).json({ error: 'User was not found.' });
    return;
  }
  const user = parseJson<User>(row.data);
  addAdminAudit(req.admin!.id, 'Deleted user account', 'user', user.id, `${user.email} (${user.role})`);
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  res.status(204).end();
});

function buildAdminEquipment(input: Partial<Equipment>, owner: User | null, current?: Equipment): Equipment {
  const safeText = (value: unknown, fallback: string, limit: number) => typeof value === 'string' ? value.trim().slice(0, limit) : fallback;
  const category = equipmentCategories.includes(input.category as Equipment['category']) ? input.category as Equipment['category'] : current?.category;
  if (!category || typeof input.title !== 'string' || !input.title.trim() || !Number.isFinite(Number(input.dailyRate)) || Number(input.dailyRate) <= 0) {
    throw new Error('Provide a valid equipment title, category, and daily rate.');
  }
  const imageUrl = isValidEquipmentImageUrl(input.imageUrl)
    ? input.imageUrl : current?.imageUrl || DEFAULT_EQUIPMENT_IMAGE;
  return {
    ...(current || {} as Equipment),
    id: current?.id || `eq-${randomBytes(10).toString('hex')}`,
    title: input.title.trim().slice(0, 120), category, dailyRate: Number(input.dailyRate),
    locationState: safeText(input.locationState, current?.locationState || '', 80), locationLGA: safeText(input.locationLGA, current?.locationLGA || '', 100),
    horsepower: Math.max(0, Math.min(Number(input.horsepower) || 0, 2000)), quantityInStock: Math.max(1, Math.min(Math.floor(Number(input.quantityInStock) || current?.quantityInStock || 1), 100000)),
    ownerName: owner?.name || safeText(input.ownerName, current?.ownerName || 'Platform inventory', 120), ownerRating: current?.ownerRating || 0, ownerReviewCount: current?.ownerReviewCount || 0,
    verified: typeof input.verified === 'boolean' ? input.verified : current?.verified || false, imageUrl,
    availability: availabilityStatuses.includes(input.availability as Equipment['availability']) ? input.availability as Equipment['availability'] : current?.availability || 'Available',
    description: safeText(input.description, current?.description || '', 2000), healthNotes: safeText(input.healthNotes, current?.healthNotes || '', 500),
    specs: { ...(current?.specs || { fuelType: 'Not specified', condition: 'Not inspected', insuranceProtected: false }), fuelType: safeText(input.specs?.fuelType, current?.specs?.fuelType || 'Not specified', 100), workingWidth: safeText(input.specs?.workingWidth, current?.specs?.workingWidth || '', 100), condition: safeText(input.specs?.condition, current?.specs?.condition || 'Not inspected', 100), insuranceProtected: input.specs?.insuranceProtected === true },
  };
}

app.post('/api/admin/equipment', requireAdminRole('superadmin'), (req: AdminRequest, res) => {
  const input = req.body as Partial<Equipment> & { ownerId?: string | null };
  const owner = input.ownerId ? getUserById(input.ownerId) || null : null;
  if (input.ownerId && !owner) {
    res.status(404).json({ error: 'The selected owner was not found.' });
    return;
  }
  try {
    const equipment = buildAdminEquipment(input, owner);
    db.prepare('INSERT INTO equipment (id, owner_id, data) VALUES (?, ?, ?)').run(equipment.id, owner?.id || null, JSON.stringify(equipment));
    addAdminAudit(req.admin!.id, 'Created equipment listing', 'equipment', equipment.id, equipment.title);
    res.status(201).json({ ...equipment, ownerId: owner?.id || null });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid equipment listing.' });
  }
});

app.patch('/api/admin/equipment/:id', requireAdminRole('superadmin'), (req: AdminRequest, res) => {
  const row = db.prepare('SELECT owner_id, data FROM equipment WHERE id = ?').get(req.params.id) as { owner_id: string | null; data: string } | undefined;
  if (!row) {
    res.status(404).json({ error: 'Equipment was not found.' });
    return;
  }
  const input = req.body as Partial<Equipment> & { ownerId?: string | null };
  const owner = input.ownerId ? getUserById(input.ownerId) || null : row.owner_id ? getUserById(row.owner_id) || null : null;
  if (input.ownerId && !owner) {
    res.status(404).json({ error: 'The selected owner was not found.' });
    return;
  }
  try {
    const equipment = buildAdminEquipment(input, owner, parseJson<Equipment>(row.data));
    db.prepare('UPDATE equipment SET owner_id = ?, data = ? WHERE id = ?').run(owner?.id || null, JSON.stringify(equipment), req.params.id);
    addAdminAudit(req.admin!.id, 'Updated equipment listing', 'equipment', equipment.id, equipment.title);
    res.json({ ...equipment, ownerId: owner?.id || null });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid equipment listing.' });
  }
});

app.delete('/api/admin/equipment/:id', requireAdminRole('superadmin'), (req: AdminRequest, res) => {
  const row = db.prepare('SELECT data FROM equipment WHERE id = ?').get(req.params.id) as { data: string } | undefined;
  if (!row) {
    res.status(404).json({ error: 'Equipment was not found.' });
    return;
  }
  const equipment = parseJson<Equipment>(row.data);
  addAdminAudit(req.admin!.id, 'Deleted equipment listing', 'equipment', equipment.id, equipment.title);
  db.prepare('DELETE FROM equipment WHERE id = ?').run(equipment.id);
  res.status(204).end();
});

app.get('/api/health', (_req, res) => {
  const start = performance.now();
  db.prepare('SELECT 1').get();
  res.json({ status: 'ok', database: 'sqlite', latencyMs: Math.max(1, Math.round(performance.now() - start)) });
});

app.get('/api/bootstrap', (req: AuthRequest, res) => {
  const equipment = db.prepare('SELECT data FROM equipment ORDER BY rowid DESC').all() as Array<{ data: string }>;
  const bookings = req.user
    ? db.prepare('SELECT data FROM bookings WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id) as Array<{ data: string }>
    : [];
  const requests = req.user?.role === 'owner'
    ? db.prepare('SELECT data FROM rental_requests WHERE owner_id = ? ORDER BY rowid DESC').all(req.user.id) as Array<{ data: string }>
    : [];
  res.json({
    user: req.user || null,
    equipment: equipment.map(row => parseJson<Equipment>(row.data)),
    bookings: bookings.map(row => parseJson<Booking>(row.data)),
    rentalRequests: requests.map(row => parseJson<RentalRequest>(row.data)),
  });
});

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const { name, email, phone, password, role, location, state, lga, farmSizeHectares, fleetCount } = req.body ?? {};
  if (typeof name !== 'string' || name.trim().length < 2) {
    res.status(400).json({ error: 'Enter your name.' });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Enter a valid email address.' });
    return;
  }
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    res.status(400).json({ error: 'Password must be at least 8 characters.' });
    return;
  }
  if (role !== 'farmer' && role !== 'owner') {
    res.status(400).json({ error: 'Choose a valid account role.' });
    return;
  }
  const phoneResult = typeof phone === 'string' ? formatAndValidateNigerianPhone(phone) : null;
  if (!phoneResult?.isValid) {
    res.status(400).json({ error: phoneResult?.error || 'Enter a valid Nigerian phone number.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email.trim());
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const user: User = {
    id: `usr-${randomBytes(12).toString('hex')}`,
    name: name.trim().slice(0, 100),
    phone: phoneResult.formatted,
    email: email.trim().toLowerCase(),
    role,
    location: typeof location === 'string' ? location.trim().slice(0, 300) : '',
    state: typeof state === 'string' ? state.trim().slice(0, 80) : undefined,
    lga: typeof lga === 'string' ? lga.trim().slice(0, 100) : undefined,
    farmSizeHectares: role === 'farmer' ? Number(farmSizeHectares) || undefined : undefined,
    fleetCount: role === 'owner' ? Number(fleetCount) || undefined : undefined,
    verified: false,
    savedEquipmentIds: [],
    hasDualRole: false,
    isDemo: false,
    onboardingCompleted: false,
  };
  const salt = randomBytes(16).toString('hex');
  const digest = await passwordDigest(password, salt);
  db.prepare('INSERT INTO users (id, email, password_salt, password_hash, data, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(user.id, user.email, salt, digest.toString('hex'), JSON.stringify(user), new Date().toISOString());
  addActivity(user.id, {
    action: 'Account Registered',
    category: 'account',
    details: `${user.name} (${user.role}) — ${user.location}`,
    status: 'completed',
  });

  const token = randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(hashToken(token), user.id, Date.now() + sessionLifetimeSeconds * 1000);
  setSessionCookie(res, token);
  res.status(201).json({ user });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!isValidEmail(email) || typeof password !== 'string' || !password || password.length > 128) {
    res.status(400).json({ error: 'Enter a valid email and password.' });
    return;
  }
  const row = db.prepare('SELECT id, email, password_salt, password_hash, data FROM users WHERE email = ? COLLATE NOCASE')
    .get(email.trim()) as UserRow | undefined;
  const candidate = row ? await passwordDigest(password, row.password_salt) : Buffer.alloc(64);
  const valid = !!row && timingSafeEqual(candidate, Buffer.from(row.password_hash, 'hex'));
  if (!row || !valid) {
    res.status(401).json({ error: 'Email or password is incorrect.' });
    return;
  }
  const user = getUserById(row.id)!;
  const token = randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(hashToken(token), user.id, Date.now() + sessionLifetimeSeconds * 1000);
  setSessionCookie(res, token);
  addActivity(user.id, {
    action: 'User Signed In',
    category: 'auth',
    details: `Signed in as ${user.name} (${user.role})`,
    status: 'completed',
  });
  res.json({ user });
}));

app.post('/api/auth/logout', (req: AuthRequest, res) => {
  const token = getSessionToken(req);
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  if (req.user) {
    addActivity(req.user.id, {
      action: 'Session Terminated',
      category: 'auth',
      details: `User ${req.user.name} signed out`,
      status: 'completed',
    });
  }
  clearSessionCookie(res);
  res.status(204).end();
});

app.patch('/api/auth/profile', requireUser, (req: AuthRequest, res) => {
  const currentUser = req.user!;
  const input = req.body ?? {};
  const allowedFields: Array<keyof User> = [
    'name', 'phone', 'email', 'role', 'location', 'state', 'lga',
    'farmSizeHectares', 'fleetCount', 'settings', 'savedEquipmentIds', 'hasDualRole', 'onboardingCompleted', 'farmManagement',
  ];
  const updates: Partial<User> = {};
  for (const field of allowedFields) {
    if (field in input) (updates as Record<string, unknown>)[field] = input[field];
  }
  if (updates.email !== undefined && !isValidEmail(updates.email)) {
    res.status(400).json({ error: 'Enter a valid email address.' });
    return;
  }
  if (updates.role !== undefined && updates.role !== 'farmer' && updates.role !== 'owner') {
    res.status(400).json({ error: 'Choose a valid account role.' });
    return;
  }
  if (updates.phone !== undefined) {
    const phone = typeof updates.phone === 'string' ? formatAndValidateNigerianPhone(updates.phone) : null;
    if (!phone?.isValid) {
      res.status(400).json({ error: phone?.error || 'Enter a valid Nigerian phone number.' });
      return;
    }
    updates.phone = phone.formatted;
  }
  if (updates.name !== undefined && (typeof updates.name !== 'string' || !updates.name.trim())) {
    res.status(400).json({ error: 'Name cannot be empty.' });
    return;
  }
  const user = { ...currentUser, ...updates, id: currentUser.id, verified: currentUser.verified };
  try {
    db.prepare('UPDATE users SET email = ?, data = ? WHERE id = ?')
      .run(user.email.trim().toLowerCase(), JSON.stringify(user), user.id);
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    throw error;
  }
  addActivity(user.id, {
    action: 'User Profile Updated',
    category: 'account',
    details: `${user.name} (${user.role}) — ${user.location}`,
    status: 'completed',
  });
  res.json({ user });
});

app.post('/api/auth/password', requireUser, asyncRoute(async (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    res.status(400).json({ error: 'New password must be between 8 and 128 characters.' });
    return;
  }
  const row = db.prepare('SELECT password_salt, password_hash FROM users WHERE id = ?').get(req.user!.id) as
    { password_salt: string; password_hash: string };
  const currentDigest = typeof currentPassword === 'string'
    ? await passwordDigest(currentPassword, row.password_salt)
    : Buffer.alloc(64);
  if (!timingSafeEqual(currentDigest, Buffer.from(row.password_hash, 'hex'))) {
    res.status(401).json({ error: 'Current password is incorrect.' });
    return;
  }
  const salt = randomBytes(16).toString('hex');
  const digest = await passwordDigest(newPassword, salt);
  db.prepare('UPDATE users SET password_salt = ?, password_hash = ? WHERE id = ?')
    .run(salt, digest.toString('hex'), req.user!.id);
  res.json({ message: 'Password updated.' });
}));

app.delete('/api/auth/account', requireUser, (req: AuthRequest, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user!.id);
  clearSessionCookie(res);
  res.status(204).end();
});

app.get('/api/activities', requireUser, (req: AuthRequest, res) => {
  const rows = db.prepare('SELECT data FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(req.user!.id) as Array<{ data: string }>;
  res.json(rows.map(row => parseJson<ActivityLogItem>(row.data)));
});

app.post('/api/activities', requireUser, (req: AuthRequest, res) => {
  const { action, category, details, status } = req.body ?? {};
  const categories = ['rental', 'wishlist', 'fleet', 'account', 'auth'];
  const statuses = ['completed', 'pending', 'info'];
  if (typeof action !== 'string' || typeof details !== 'string' || !categories.includes(category) || !statuses.includes(status)) {
    res.status(400).json({ error: 'Activity details are invalid.' });
    return;
  }
  const activity = addActivity(req.user!.id, {
    action: action.slice(0, 100),
    category,
    details: details.slice(0, 500),
    status,
  });
  res.status(201).json(activity);
});

app.delete('/api/activities', requireUser, (req: AuthRequest, res) => {
  db.prepare('DELETE FROM activity_logs WHERE user_id = ?').run(req.user!.id);
  res.status(204).end();
});

app.post('/api/bookings', requireUser, (req: AuthRequest, res) => {
  const { equipmentId, startDate, endDate, farmAddress, state, lga, farmerPhone, deliveryMethod, paymentMethod } = req.body ?? {};
  const isCalendarDate = (value: string) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  if (typeof equipmentId !== 'string' || typeof startDate !== 'string' || typeof endDate !== 'string'
    || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !isCalendarDate(startDate)
    || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || !isCalendarDate(endDate)
    || new Date(startDate).getTime() > new Date(endDate).getTime()) {
    res.status(400).json({ error: 'Choose valid rental dates and equipment.' });
    return;
  }
  const validPhone = typeof farmerPhone === 'string' ? formatAndValidateNigerianPhone(farmerPhone) : null;
  if (!validPhone?.isValid) {
    res.status(400).json({ error: validPhone?.error || 'Enter a valid Nigerian phone number.' });
    return;
  }
  if (typeof farmAddress !== 'string' || !farmAddress.trim() || farmAddress.length > 300
    || (state !== undefined && (typeof state !== 'string' || state.length > 80))
    || (lga !== undefined && (typeof lga !== 'string' || lga.length > 100))) {
    res.status(400).json({ error: 'Enter a valid delivery address.' });
    return;
  }
  if (!['delivery', 'pickup'].includes(deliveryMethod) || !['opay', 'verve', 'transfer'].includes(paymentMethod)) {
    res.status(400).json({ error: 'Choose a valid delivery and demo payment method.' });
    return;
  }
  const row = db.prepare('SELECT owner_id, data FROM equipment WHERE id = ?').get(equipmentId) as
    { owner_id: string | null; data: string } | undefined;
  if (!row) {
    res.status(404).json({ error: 'Equipment was not found.' });
    return;
  }
  const equipment = parseJson<Equipment>(row.data);
  if (equipment.availability !== 'Available') {
    res.status(409).json({ error: 'This equipment is not currently available.' });
    return;
  }
  const days = calculateDateDiffDays(startDate, endDate);
  const pricing = calculateBookingPricing(equipment.dailyRate, days, deliveryMethod);
  const now = new Date().toISOString();
  const booking: Booking = {
    id: `BK-${Date.now()}-${randomBytes(3).toString('hex')}`,
    equipmentId: equipment.id,
    equipmentTitle: equipment.title,
    equipmentImage: equipment.imageUrl,
    category: equipment.category,
    farmerName: req.user!.name,
    farmerPhone: validPhone.formatted,
    farmAddress: farmAddress.trim(),
    state: typeof state === 'string' ? state.slice(0, 80) : req.user!.state || '',
    lga: typeof lga === 'string' ? lga.slice(0, 100) : req.user!.lga || '',
    startDate,
    endDate,
    days,
    dailyRate: equipment.dailyRate,
    subtotal: pricing.subtotal,
    deliveryFee: pricing.deliveryFee,
    serviceInsuranceFee: pricing.serviceInsuranceFee,
    harvestDiscount: pricing.harvestDiscount,
    totalAmount: pricing.total,
    deliveryMethod,
    paymentMethod,
    status: 'Pending Approval',
    demoReference: `DEMO-${randomBytes(8).toString('hex').toUpperCase()}`,
    preCheckCompleted: false,
    createdAt: now,
  };
  const addBooking = db.prepare('INSERT INTO bookings (id, user_id, data, created_at) VALUES (?, ?, ?, ?)');
  const addRequest = db.prepare('INSERT INTO rental_requests (id, owner_id, data) VALUES (?, ?, ?)');
  const transaction = db.transaction(() => {
    addBooking.run(booking.id, req.user!.id, JSON.stringify(booking), booking.createdAt);
    const request: RentalRequest = {
      id: `req-${randomBytes(10).toString('hex')}`,
      bookingId: booking.id,
      equipmentId: equipment.id,
      equipmentTitle: equipment.title,
      farmerName: req.user!.name,
      farmerLocation: `${booking.lga}, ${booking.state}`,
      startDate,
      endDate,
      days,
      totalPayout: pricing.total,
      farmSizeHectares: req.user!.farmSizeHectares || 0,
      cropType: 'Not specified',
      status: 'pending',
      requestTimestamp: 'Just now',
    };
    const equipmentRow = db.prepare('SELECT owner_id FROM equipment WHERE id = ?').get(equipment.id) as { owner_id: string | null };
    addRequest.run(request.id, equipmentRow.owner_id, JSON.stringify(request));
    addActivity(req.user!.id, {
      action: 'Rental Request Submitted',
      category: 'rental',
      details: `${equipment.title} for ${days} days`,
      status: 'completed',
    });
  });
  transaction();
  res.status(201).json(booking);
});

app.patch('/api/bookings/:id/complete', requireUser, (req: AuthRequest, res) => {
  if (req.user!.role !== 'farmer' && !req.user!.hasDualRole) {
    res.status(403).json({ error: 'Only the renting farmer can complete this rental.' });
    return;
  }
  const row = db.prepare('SELECT user_id, data FROM bookings WHERE id = ?').get(req.params.id) as
    { user_id: string; data: string } | undefined;
  if (!row) {
    res.status(404).json({ error: 'Booking was not found.' });
    return;
  }
  if (row.user_id !== req.user!.id) {
    res.status(403).json({ error: 'You cannot update another farmer’s booking.' });
    return;
  }
  const booking = parseJson<Booking>(row.data);
  if (booking.status !== 'Accepted') {
    res.status(400).json({ error: 'Only an accepted rental can be marked as returned.' });
    return;
  }
  if (new Date(`${booking.endDate}T23:59:59.999Z`).getTime() > Date.now()) {
    res.status(400).json({ error: 'This rental cannot be completed before its return date.' });
    return;
  }
  const updated = { ...booking, status: 'Completed' as const, completedAt: new Date().toISOString() };
  db.prepare('UPDATE bookings SET data = ? WHERE id = ?').run(JSON.stringify(updated), booking.id);
  addActivity(req.user!.id, {
    action: 'Rental Completed',
    category: 'rental',
    details: `${booking.equipmentTitle} marked returned after use`,
    status: 'completed',
  });
  res.json(updated);
});

app.patch('/api/bookings/:id/rating', requireUser, (req: AuthRequest, res) => {
  if (req.user!.role !== 'farmer' && !req.user!.hasDualRole) {
    res.status(403).json({ error: 'Only the renting farmer can rate this rental.' });
    return;
  }
  const rating = Number(req.body?.rating);
  const review = typeof req.body?.review === 'string' ? req.body.review.trim().slice(0, 1000) : '';
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Choose a rating from 1 to 5.' });
    return;
  }
  const row = db.prepare('SELECT user_id, data FROM bookings WHERE id = ?').get(req.params.id) as
    { user_id: string; data: string } | undefined;
  if (!row) {
    res.status(404).json({ error: 'Booking was not found.' });
    return;
  }
  if (row.user_id !== req.user!.id) {
    res.status(403).json({ error: 'You cannot rate another farmer’s booking.' });
    return;
  }
  const booking = parseJson<Booking>(row.data);
  if (booking.status !== 'Completed') {
    res.status(400).json({ error: 'Complete and return the rental before rating it.' });
    return;
  }
  if (booking.farmerRating) {
    res.status(409).json({ error: 'This rental has already been rated.' });
    return;
  }
  const equipmentRow = db.prepare('SELECT data FROM equipment WHERE id = ?').get(booking.equipmentId) as { data: string } | undefined;
  if (!equipmentRow) {
    res.status(404).json({ error: 'The rented equipment was not found.' });
    return;
  }
  const equipment = parseJson<Equipment>(equipmentRow.data);
  const reviewCount = Math.max(0, equipment.ownerReviewCount || 0);
  const nextReviewCount = reviewCount + 1;
  const nextRating = ((equipment.ownerRating || 0) * reviewCount + rating) / nextReviewCount;
  const updatedBooking = { ...booking, farmerRating: rating, farmerReview: review, ratedAt: new Date().toISOString() };
  const updatedEquipment = { ...equipment, ownerRating: Number(nextRating.toFixed(1)), ownerReviewCount: nextReviewCount };
  const transaction = db.transaction(() => {
    db.prepare('UPDATE bookings SET data = ? WHERE id = ?').run(JSON.stringify(updatedBooking), booking.id);
    db.prepare('UPDATE equipment SET data = ? WHERE id = ?').run(JSON.stringify(updatedEquipment), equipment.id);
    addActivity(req.user!.id, {
      action: 'Equipment Rated',
      category: 'rental',
      details: `${equipment.title} received ${rating}/5 after completed rental`,
      status: 'completed',
    });
  });
  transaction();
  res.json({ booking: updatedBooking, equipment: updatedEquipment });
});

app.patch('/api/rental-requests/:id', requireUser, (req: AuthRequest, res) => {
  if (req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Only equipment owners can respond to rental requests.' });
    return;
  }
  const status = req.body?.status;
  if (status !== 'accepted' && status !== 'declined') {
    res.status(400).json({ error: 'Choose accepted or declined.' });
    return;
  }
  const row = db.prepare('SELECT owner_id, data FROM rental_requests WHERE id = ?').get(req.params.id) as
    { owner_id: string | null; data: string } | undefined;
  if (!row) {
    res.status(404).json({ error: 'Rental request was not found.' });
    return;
  }
  if (row.owner_id !== req.user!.id) {
    res.status(403).json({ error: 'You cannot respond to another owner’s request.' });
    return;
  }
  const request = { ...parseJson<RentalRequest>(row.data), status };
  db.prepare('UPDATE rental_requests SET data = ? WHERE id = ?').run(JSON.stringify(request), req.params.id);
  if (request.bookingId) {
    const bookingRow = db.prepare('SELECT data FROM bookings WHERE id = ?').get(request.bookingId) as { data: string } | undefined;
    if (bookingRow) {
      const booking = parseJson<Booking>(bookingRow.data);
      const bookingStatus: Booking['status'] = status === 'accepted' ? 'Accepted' : 'Declined';
      db.prepare('UPDATE bookings SET data = ? WHERE id = ?')
        .run(JSON.stringify({ ...booking, status: bookingStatus }), request.bookingId);
    }
  }
  addActivity(req.user!.id, {
    action: status === 'accepted' ? 'Rental Request Approved' : 'Rental Request Declined',
    category: 'rental',
    details: `${request.farmerName} — ${request.equipmentTitle}`,
    status: 'completed',
  });
  res.json(request);
});

app.post('/api/equipment', requireUser, (req: AuthRequest, res) => {
  if (req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Only equipment owners can publish machinery.' });
    return;
  }
  const input = req.body as Partial<Equipment> | null;
  const categories: Equipment['category'][] = ['Tractors', 'Harvesters', 'Irrigation', 'Tillers', 'Planters', 'Trailers', 'Ploughs', 'Sprayers', 'Seeders', 'Threshers', 'Balers', 'Cultivators', 'Shellers'];
  if (!input || typeof input.title !== 'string' || !input.title.trim() || input.title.length > 120
    || !Number.isFinite(input.dailyRate) || Number(input.dailyRate) <= 0 || Number(input.dailyRate) > 1_000_000_000
    || !categories.includes(input.category as Equipment['category'])) {
    res.status(400).json({ error: 'Provide an equipment title and a valid daily rate.' });
    return;
  }
  const safeText = (value: unknown, fallback: string, limit: number) =>
    typeof value === 'string' ? value.trim().slice(0, limit) : fallback;
  const imageUrl = isValidEquipmentImageUrl(input.imageUrl)
    ? input.imageUrl
    : DEFAULT_EQUIPMENT_IMAGE;
  const equipment: Equipment = {
    id: `eq-${randomBytes(10).toString('hex')}`,
    title: input.title.trim().slice(0, 120),
    category: input.category as Equipment['category'],
    dailyRate: Number(input.dailyRate),
    locationState: safeText(input.locationState, '', 80),
    locationLGA: safeText(input.locationLGA, '', 100),
    horsepower: Math.max(0, Math.min(Number(input.horsepower) || 0, 2000)),
    quantityInStock: Math.max(1, Math.min(Math.floor(Number(input.quantityInStock) || 1), 100000)),
    ownerName: req.user!.name,
    ownerRating: 0,
    ownerReviewCount: 0,
    verified: false,
    availability: 'Available',
    imageUrl,
    description: safeText(input.description, '', 2000),
    healthNotes: safeText(input.healthNotes, '', 500),
    specs: {
      fuelType: safeText(input.specs?.fuelType, 'Not specified', 100),
      workingWidth: safeText(input.specs?.workingWidth, '', 100),
      condition: safeText(input.specs?.condition, 'Not inspected', 100),
      insuranceProtected: false,
    },
  };
  db.prepare('INSERT INTO equipment (id, owner_id, data) VALUES (?, ?, ?)').run(equipment.id, req.user!.id, JSON.stringify(equipment));
  addActivity(req.user!.id, {
    action: 'New Machinery Listed',
    category: 'fleet',
    details: `${equipment.title} (${equipment.category}) in ${equipment.locationState}`,
    status: 'completed',
  });
  res.status(201).json(equipment);
});

app.patch('/api/equipment/:id', requireUser, (req: AuthRequest, res) => {
  if (req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Only equipment owners can edit machinery.' });
    return;
  }
  const row = db.prepare('SELECT owner_id, data FROM equipment WHERE id = ?').get(req.params.id) as
    { owner_id: string | null; data: string } | undefined;
  if (!row) {
    res.status(404).json({ error: 'Equipment was not found.' });
    return;
  }
  if (row.owner_id !== req.user!.id) {
    res.status(403).json({ error: 'You cannot edit another owner’s equipment.' });
    return;
  }
  const current = parseJson<Equipment>(row.data);
  const input = req.body as Partial<Equipment> | null;
  const categories: Equipment['category'][] = ['Tractors', 'Harvesters', 'Irrigation', 'Tillers', 'Planters', 'Trailers', 'Ploughs', 'Sprayers', 'Seeders', 'Threshers', 'Balers', 'Cultivators', 'Shellers'];
  if (!input || typeof input.title !== 'string' || !input.title.trim() || input.title.length > 120
    || !Number.isFinite(input.dailyRate) || Number(input.dailyRate) <= 0
    || !categories.includes(input.category as Equipment['category'])) {
    res.status(400).json({ error: 'Provide an equipment title and a valid daily rate.' });
    return;
  }
  const safeText = (value: unknown, fallback: string, limit: number) =>
    typeof value === 'string' ? value.trim().slice(0, limit) : fallback;
  const imageUrl = isValidEquipmentImageUrl(input.imageUrl)
    ? input.imageUrl
    : current.imageUrl;
  const updated: Equipment = {
    ...current,
    title: input.title.trim().slice(0, 120),
    category: input.category as Equipment['category'],
    dailyRate: Number(input.dailyRate),
    locationState: safeText(input.locationState, current.locationState, 80),
    locationLGA: safeText(input.locationLGA, current.locationLGA, 100),
    horsepower: Math.max(0, Math.min(Number(input.horsepower) || 0, 2000)),
    quantityInStock: Math.max(1, Math.min(Math.floor(Number(input.quantityInStock) || current.quantityInStock || 1), 100000)),
    imageUrl,
    description: safeText(input.description, current.description, 2000),
    healthNotes: safeText(input.healthNotes, current.healthNotes || '', 500),
    specs: {
      ...current.specs,
      fuelType: safeText(input.specs?.fuelType, current.specs.fuelType, 100),
      workingWidth: safeText(input.specs?.workingWidth, current.specs.workingWidth || '', 100),
      condition: safeText(input.specs?.condition, current.specs.condition || 'Not inspected', 100),
    },
  };
  db.prepare('UPDATE equipment SET data = ? WHERE id = ?').run(JSON.stringify(updated), req.params.id);
  addActivity(req.user!.id, {
    action: 'Machinery Listing Updated',
    category: 'fleet',
    details: `${updated.title} (${updated.category})`,
    status: 'completed',
  });
  res.json(updated);
});

app.patch('/api/equipment/:id/status', requireUser, (req: AuthRequest, res) => {
  if (req.user!.role !== 'owner') {
    res.status(403).json({ error: 'Only equipment owners can change availability.' });
    return;
  }
  const availability = req.body?.availability;
  if (!['Available', 'Active rental', 'Maintenance'].includes(availability)) {
    res.status(400).json({ error: 'Choose a valid availability status.' });
    return;
  }
  const row = db.prepare('SELECT owner_id, data FROM equipment WHERE id = ?').get(req.params.id) as
    { owner_id: string | null; data: string } | undefined;
  if (!row) {
    res.status(404).json({ error: 'Equipment was not found.' });
    return;
  }
  const equipment = parseJson<Equipment>(row.data);
  if (row.owner_id && row.owner_id !== req.user!.id) {
    res.status(403).json({ error: 'You cannot update another owner’s equipment.' });
    return;
  }
  if (!row.owner_id && !equipment.ownerName.includes(req.user!.name)) {
    res.status(403).json({ error: 'You cannot update another owner’s equipment.' });
    return;
  }
  const updated = { ...equipment, availability };
  db.prepare('UPDATE equipment SET data = ? WHERE id = ?').run(JSON.stringify(updated), req.params.id);
  addActivity(req.user!.id, {
    action: 'Machinery Availability Updated',
    category: 'fleet',
    details: `${updated.title} changed to ${availability}`,
    status: 'completed',
  });
  res.json(updated);
});

app.get('/api/system/stats', requireUser, (_req, res) => {
  res.json(publicStats());
});

app.post('/api/system/test-database', requireUser, (_req, res) => {
  const start = performance.now();
  const result = db.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
  const connected = result.integrity_check === 'ok';
  res.json({
    connected,
    latencyMs: Math.max(1, Math.round(performance.now() - start)),
    recordCounts: publicStats(),
    storageEngine: 'SQLite',
    checksum: result.integrity_check,
    message: connected ? 'SQLite integrity check passed.' : 'SQLite integrity check failed.',
  });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

if (process.env.NODE_ENV === 'production') {
  const distPath = path.resolve(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API request failed:', error);
  res.status(500).json({ error: 'An unexpected server error occurred.' });
});

migrateLegacyImagePaths();
await initializeDemoData();
await initializeAdminAccount();
app.listen(port, '0.0.0.0', () => {
  console.log(`AgriRent API listening on port ${port} using SQLite at ${databasePath}`);
});
