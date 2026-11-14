# Zero Group Test Commands Quick Reference

| Command | Purpose | Environment |
|---|---|---|
| `node scripts/db-test.js npx prisma db push --skip-generate` | Sync schema to test database | Isolated `project7_test` |
| `node scripts/db-test.js npm run db:seed:essentials` | Seed essential users & yard config | Isolated `project7_test` |
| `npm run test:unit` | Jest Unit Tests (`testing/1_unit`) | Isolated test DB / Mocks |
| `npm run test:integration` | Jest Integration Tests (`testing/2_integration`) | Isolated test DB |
| `npm run test:security` | RBAC & Security Boundary Tests (`testing/7_security`) | Isolated test DB |
| `npm run test:system` | Playwright System Spec (`testing/3_system`) | Chromium |
| `npm run test:acceptance` | Playwright Acceptance Spec (`testing/4_acceptance`) | Chromium |
| `npm run test:simulation` | Full 28-day Multi-Role Schedule Replay | Headless Chromium |
| `npm run test:simulation:headed` | Full Multi-Role Schedule Replay with UI | Headed Chromium |
| `npm run lint` | Next.js & ESLint verification | Static analysis |
