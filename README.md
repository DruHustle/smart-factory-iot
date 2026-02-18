# Smart Factory IoT Dashboard

Full-stack IoT dashboard with React + Express + tRPC + Drizzle ORM.

## Stack

- Frontend: React, Vite, TailwindCSS
- Backend: Express, tRPC
- Database: PostgreSQL (local for dev, managed for prod)
- Auth: JWT (cookie + bearer token)

## Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL database (Aiven or local)

## Development Setup (Step by Step)

1. Clone and enter the repo.

```bash
git clone https://github.com/DruHustle/smart-factory-iot
cd smart-factory-iot
```

2. Install dependencies.

```bash
pnpm install
```

3. Create `.env` from `.env.example`.

```bash
cp .env.example .env
```

4. Configure PostgreSQL in `.env`.

```bash
NODE_ENV=development
PORT=3000
VITE_API_URL=http://localhost:3000/api
BACKEND_URL=http://localhost:3000
JWT_SECRET=your-secret-key

# Development (local PostgreSQL)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/smart_factory_iot
DATABASE_SSL_MODE=disable

# Production (managed PostgreSQL)
# DATABASE_URL=postgres://username:password@host:port/database?sslmode=require
# DATABASE_SSL_MODE=require
# DATABASE_CA_CERT=-----BEGIN CERTIFICATE-----\nYOUR_CA_CERT\n-----END CERTIFICATE-----
```

5. Start local PostgreSQL (development).

```bash
docker run --name smart-factory-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=smart_factory_iot \
  -p 5432:5432 -d postgres:16
```

6. Apply schema migrations.

```bash
pnpm db:push
```

7. Run the app.

```bash
pnpm dev
```

8. Open the app.

- http://localhost:3000

## Authentication Notes

- Frontend auth now uses tRPC procedures: `auth.login`, `auth.register`, `auth.me`, `auth.logout`.
- Session token is sent as bearer token and cookie (`credentials: include`) for server-side auth.
- Registration returns and stores a valid token immediately, so users are logged in after sign-up.
- `/forgot-password` is implemented as a UI flow placeholder until reset APIs are added.

## Verification Commands

```bash
pnpm check
pnpm test
```

## Infrastructure Setup

### Local Development Infrastructure

1. Start PostgreSQL:

```bash
docker run --name smart-factory-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=smart_factory_iot \
  -p 5432:5432 -d postgres:16
```

2. Apply schema:

```bash
pnpm db:push
```

3. Start app:

```bash
pnpm dev
```

### Production Infrastructure (Vercel + Render + Aiven)

1. Backend service on Render (Node/tRPC app from this same repo).
2. Database on Aiven PostgreSQL.
3. Frontend static hosting on Vercel.

Required Render env vars:

- `NODE_ENV=production`
- `DATABASE_URL=<aiven-postgres-uri>`
- `DATABASE_SSL_MODE=require`
- `DATABASE_CA_CERT=<aiven-ca-cert>`
- `JWT_SECRET=<strong-secret>`
- `ALLOWED_ORIGIN=https://<your-vercel-app>.vercel.app`

Required Vercel env vars:

- `VITE_API_URL=https://<your-render-service>.onrender.com/api`
- `BACKEND_URL=https://<your-render-service>.onrender.com`

Required GitHub Actions secrets for Vercel deployment:

- `VERCEL_TOKEN=<token-from-vercel-account-settings>`
- `VERCEL_ORG_ID=<vercel-team-or-org-id>`
- `VERCEL_PROJECT_ID=<vercel-project-id>`

Production rollout order:

1. Deploy Render backend.
2. Run `pnpm db:push` against production DB.
3. Deploy frontend on Vercel.
4. Execute UI/auth smoke checklist below.

## UI Smoke Test Checklist

1. Open `http://localhost:3000/#/login`.
2. Click `Forgot password?`, verify it opens the reset screen, then click back to login.
3. Register a new user and confirm redirect to dashboard.
4. Logout from sidebar menu and confirm redirect to login.
5. Login again and verify dashboard loads.
6. Verify key action buttons:
   - Devices: create, view details, configure thresholds, delete.
   - Alerts: acknowledge and resolve from row actions.
   - OTA: deploy firmware and rollback completed/failed deployment.
   - Exports: device/analytics/alert history generate downloadable HTML.

## Deployment Database Policy

- Development uses local PostgreSQL.
- Production uses managed PostgreSQL (Aiven/Render/etc.) over SSL.

## Project Structure

```text
smart-factory-iot/
├── client/                 # React frontend
├── server/                 # Express backend + tRPC routers
├── drizzle/                # Drizzle schema and migrations
├── shared/                 # Shared constants/types
└── docs/                   # Technical docs
```
