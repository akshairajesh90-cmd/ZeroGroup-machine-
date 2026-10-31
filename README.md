# Zero Group - Unified Live Fleet & Site Command Center

This is a Next.js 14 App Router project designed for fleet tracking, logistics dispatching, and site operations command.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## Database Lifecycle & Deployment Guide

In accordance with strict continuous delivery principles, the Next.js build lifecycle (`npm run build`) is completely decoupled from database schema mutations and seeding scripts. A build will never mutate or overwrite database records.

### 1. Build Lifecycle (Pure & Side-Effect Free)
Running `npm run build` executes:
```bash
prisma generate && next build
```
This strictly compiles application bundles, performs TypeScript checks, and pre-renders static pages without connecting to, mutating, or seeding any database.

### 2. Database Migration at Deploy Time
To apply schema updates to the database during CI/CD deployment or release phases, run the dedicated database command **before** starting the new application container/instance:
```bash
npm run db:push
```
Or for formal migration workflows:
```bash
npx prisma migrate deploy
```

### 3. Database Seeding (Explicit Execution Only)
Database seeding scripts must never be triggered implicitly during build or start. Seed scripts must be run explicitly when provisioning new environments or staging tiers:
- **Essential Seed** (Admin user, base roles, yard settings):
  ```bash
  npm run db:seed:essentials
  ```
- **28-Day Schedule Simulation Seed**:
  ```bash
  npm run db:seed
  ```
- **Notebook Seed**:
  ```bash
  npm run db:seed:notebook
  ```

### 4. Isolated Test Database
Playwright E2E suites and destructive verification scripts run against an isolated test database (`project7_test`) configured in `.env.test`:
```bash
# Provision isolated test database schema
node scripts/db-test.js npx prisma db push --skip-generate

# Seed test database safely
node scripts/db-test.js npm run db:seed:essentials
```
This ensures production and local development data (such as the base store coordinates at `eratupeta, 9.5916, 76.5222`) remain strictly isolated and immutable during testing.
