# AgriRent showcase

AgriRent is a React/Vite frontend with an Express API and SQLite persistence. The API owns account authentication, bookings, equipment listings, owner requests, and activity records. Payment and escrow are intentionally simulated; no money is collected.

## Run locally

Requirements: Node.js 20.19 or newer.

```powershell
npm install
npm run dev
```

Open `http://localhost:3100`. The development command starts the API on port 3101 and Vite on port 3100; Vite proxies `/api` requests to Express. SQLite data is stored in `data/agrirent.sqlite` and survives restarts.

Run the type check and utility tests with `npm run lint` and `npm test`.

Local demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Farmer | `adewale.okafor@agrirent.ng` | `AgriRent2026!` |
| Owner | `tunde.farms@agrirent.ng` | `FleetMaster#2026` |

Demo accounts are seeded only outside `NODE_ENV=production`. In production, accounts must be registered normally unless `SEED_DEMO_USERS=true` is explicitly set.

## Build and host

```powershell
npm run build
npm start
```

Set `NODE_ENV=production` so Express serves the built frontend. Configure `PORT` and `DATABASE_PATH` in the host environment. The SQLite file must be on persistent storage; ephemeral container filesystems lose data on restart. This setup is intended for a single-instance showcase, not a horizontally scaled production service. Use HTTPS in production so session cookies are Secure.

## Showcase limitations

- Booking requests are calculated and saved server-side, but no payment provider or escrow service is connected.
- Listings and initial requests are illustrative seed data. New owner listings are stored but are not independently verified.
- Email/SMS, social sign-in, logistics, insurance, and payout workflows are not integrated.
- Passwords use salted scrypt hashes on the server. Sessions use random, HttpOnly, SameSite cookies stored in SQLite.

## Main API routes

- `GET /api/health`, `GET /api/bootstrap`
- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `PATCH /api/auth/profile`, `POST /api/auth/password`, `DELETE /api/auth/account`
- `POST /api/bookings`, `POST /api/equipment`, `PATCH /api/equipment/:id/status`
- `PATCH /api/rental-requests/:id`
- `GET/POST/DELETE /api/activities`
- `GET /api/system/stats`, `POST /api/system/test-database`