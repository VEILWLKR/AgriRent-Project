import { ActivityLogItem, Booking, Equipment, RentalRequest, User } from '../types';

export interface SystemStats {
  users: number;
  equipment: number;
  bookings: number;
  rentalRequests: number;
  activities: number;
}

export interface BootstrapData {
  user: User | null;
  equipment: Equipment[];
  bookings: Booking[];
  rentalRequests: RentalRequest[];
}

export interface AdminSummary {
  id: string;
  email: string;
  name: string;
  role: 'support' | 'operations' | 'finance' | 'superadmin';
}

export interface AdminAuditEvent {
  id: string;
  action: string;
  targetType: string;
  targetId?: string;
  details: string;
  createdAt: string;
  adminEmail: string;
}

export interface AdminBootstrapData {
  admin: AdminSummary;
  stats: SystemStats;
  users: Array<{ id: string; name: string; email: string; role: User['role']; location: string; verified: boolean; createdAt: string }>;
  equipment: Array<Equipment & { ownerId: string | null }>;
  audits: AdminAuditEvent[];
}

export interface RegistrationInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: 'farmer' | 'owner';
  location: string;
  state?: string;
  lga?: string;
  farmSizeHectares?: number;
  fleetCount?: number;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === 'string' ? body.error : `Request failed (${response.status}).`);
  }
  return body as T;
}

function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}

export const ApiService = {
  async load(): Promise<BootstrapData> {
    return request<BootstrapData>('/api/bootstrap');
  },

  async login(email: string, password: string): Promise<User> {
    const result = await request<{ user: User }>('/api/auth/login', { method: 'POST', body: jsonBody({ email, password }) });
    return result.user;
  },

  async register(user: RegistrationInput): Promise<User> {
    const result = await request<{ user: User }>('/api/auth/register', { method: 'POST', body: jsonBody(user) });
    return result.user;
  },

  async logout(): Promise<void> {
    await request<void>('/api/auth/logout', { method: 'POST' });
  },

  async adminLogin(email: string, password: string): Promise<AdminSummary> {
    const result = await request<{ admin: AdminSummary }>('/api/admin/auth/login', { method: 'POST', body: jsonBody({ email, password }) });
    return result.admin;
  },

  async adminLogout(): Promise<void> {
    await request<void>('/api/admin/auth/logout', { method: 'POST' });
  },

  async loadAdminBootstrap(): Promise<AdminBootstrapData> {
    return request<AdminBootstrapData>('/api/admin/bootstrap');
  },

  async adminCreateUser(input: Record<string, unknown>): Promise<User> {
    return request<User>('/api/admin/users', { method: 'POST', body: jsonBody(input) });
  },

  async adminUpdateUser(id: string, input: Record<string, unknown>): Promise<User> {
    return request<User>(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: jsonBody(input) });
  },

  async adminDeleteUser(id: string): Promise<void> {
    await request<void>(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async adminCreateEquipment(input: Record<string, unknown>): Promise<Equipment & { ownerId: string | null }> {
    return request<Equipment & { ownerId: string | null }>('/api/admin/equipment', { method: 'POST', body: jsonBody(input) });
  },

  async adminUpdateEquipment(id: string, input: Record<string, unknown>): Promise<Equipment & { ownerId: string | null }> {
    return request<Equipment & { ownerId: string | null }>(`/api/admin/equipment/${encodeURIComponent(id)}`, { method: 'PATCH', body: jsonBody(input) });
  },

  async adminDeleteEquipment(id: string): Promise<void> {
    await request<void>(`/api/admin/equipment/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async deleteAccount(): Promise<void> {
    await request<void>('/api/auth/account', { method: 'DELETE' });
  },

  async updateProfile(user: User): Promise<User> {
    const result = await request<{ user: User }>('/api/auth/profile', { method: 'PATCH', body: jsonBody(user) });
    return result.user;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await request('/api/auth/password', { method: 'POST', body: jsonBody({ currentPassword, newPassword }) });
  },

  async createBooking(input: Pick<Booking, 'equipmentId' | 'startDate' | 'endDate' | 'farmAddress' | 'state' | 'lga' | 'farmerPhone' | 'deliveryMethod' | 'paymentMethod'>): Promise<Booking> {
    return request<Booking>('/api/bookings', { method: 'POST', body: jsonBody(input) });
  },

  async updateRequest(id: string, status: 'accepted' | 'declined'): Promise<RentalRequest> {
    return request<RentalRequest>(`/api/rental-requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: jsonBody({ status }),
    });
  },

  async completeBooking(id: string): Promise<Booking> {
    return request<Booking>(`/api/bookings/${encodeURIComponent(id)}/complete`, {
      method: 'PATCH',
    });
  },

  async rateBooking(id: string, rating: number, review: string): Promise<{ booking: Booking; equipment: Equipment }> {
    return request<{ booking: Booking; equipment: Equipment }>(`/api/bookings/${encodeURIComponent(id)}/rating`, {
      method: 'PATCH',
      body: jsonBody({ rating, review }),
    });
  },

  async createEquipment(equipment: Equipment): Promise<Equipment> {
    return request<Equipment>('/api/equipment', { method: 'POST', body: jsonBody(equipment) });
  },

  async updateEquipment(equipment: Equipment): Promise<Equipment> {
    return request<Equipment>(`/api/equipment/${encodeURIComponent(equipment.id)}`, {
      method: 'PATCH',
      body: jsonBody(equipment),
    });
  },

  async updateEquipmentStatus(id: string, availability: Equipment['availability']): Promise<Equipment> {
    return request<Equipment>(`/api/equipment/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: jsonBody({ availability }),
    });
  },

  async logActivity(activity: Omit<ActivityLogItem, 'id' | 'timestamp'>): Promise<ActivityLogItem> {
    return request<ActivityLogItem>('/api/activities', { method: 'POST', body: jsonBody(activity) });
  },

  async getSystemStats(): Promise<SystemStats> {
    return request<SystemStats>('/api/system/stats');
  },

  async testDatabaseConnection() {
    return request<{
      connected: boolean;
      latencyMs: number;
      recordCounts: SystemStats;
      storageEngine: string;
      checksum: string;
      message: string;
    }>('/api/system/test-database', { method: 'POST' });
  },
};
