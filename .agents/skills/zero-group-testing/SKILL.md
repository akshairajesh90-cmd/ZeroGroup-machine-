---
name: zero-group-testing
description: >-
  Testing runbook and verification workflows for Zero Group. Use when executing Jest test suites (unit, integration,
  regression, security), running Playwright end-to-end / multi-role operational simulations, provisioning the isolated
  project7_test database, or diagnosing test failures.
---

# Zero Group Testing & Quality Verification Skill

This skill guides testing execution, test database setup, and Playwright multi-role simulation validation for **Zero Group**.

---

## 1. Test Database Isolation Architecture

To ensure safety and prevent polluting local or cloud development databases:
- All E2E tests and integration suites execute against a dedicated database named **`project7_test`** configured in `.env.test`.
- The helper script `scripts/db-test.js` sets `DOTENV_CONFIG_PATH=.env.test` and executes commands safely.
- `src/lib/db-guard.ts` verifies that the target database ends with `_test`. If it does not, execution is immediately halted.

### Setup and Provisioning Commands

```bash
# Push schema changes to the isolated test database
node scripts/db-test.js npx prisma db push --skip-generate

# Seed essential roles, users, and base settings to test DB
node scripts/db-test.js npm run db:seed:essentials

# (Optional) Seed 28-day tight schedule simulation data
node scripts/db-test.js npm run db:seed
```

---

## 2. Jest Test Execution Tiers

The project organizes Jest tests into categorized tiers under `testing/` and `src/`:

```bash
# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run regression tests
npm run test:regression

# Run security & RBAC tests
npm run test:security

# Run performance benchmark tests
npm run test:performance

# Run all Jest tests
npm run test:jest-all
```

---

## 3. Playwright E2E and Multi-Role Simulation

Playwright suites verify real user flows across Owner, Staff, Driver, and Operator portals:

```bash
# Run acceptance test suite (Chromium)
npm run test:acceptance

# Run system E2E tests (Chromium)
npm run test:system

# Run full 28-day operational simulation (headless)
npm run test:simulation

# Run simulation in headed mode (visible browser for debugging)
npm run test:simulation:headed
```

---

## 4. Troubleshooting Common Failures

### 1. `[CRITICAL DB GUARD] Execution blocked`
- **Cause**: The command ran against a database without `_test` suffix or without localhost credentials.
- **Fix**: Prepend `node scripts/db-test.js` or set `DATABASE_URL` in `.env.test` to point to `project7_test`.

### 2. OCC Conflict / Version Mismatch in Tests
- **Cause**: Two simulated actions or tests modified the same record concurrently without refetching the updated `version`.
- **Fix**: Re-fetch the latest database record before asserting or dispatching subsequent mutations.

### 3. Geolocation Accuracy Rejection
- **Cause**: Mocked location coordinates provided horizontal accuracy $> 100$ meters or calculated speed $> 130$ km/h.
- **Fix**: Supply clean mock coordinates within Kerala boundaries (e.g., Erattupetta `9.5916, 76.5222`) with accuracy $\le 15$m.

---

## Reference Documents
- [Test Commands Cheatsheet](./references/test-commands.md)
