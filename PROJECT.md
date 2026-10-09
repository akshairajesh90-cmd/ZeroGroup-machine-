# PROJECT.md

## Architecture
- e2e/ directory for playwright tests.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Admin Tests | `/admin/*` | none | PLANNED |
| 2 | Staff Tests | `/staff/*` | none | PLANNED |
| 3 | Driver Tests | `/driver/*` | none | PLANNED |
| 4 | Operator Tests | `/operator/*` | none | PLANNED |
| 5 | Workflow Tests | Circular Workflow | M1, M2, M3, M4 | PLANNED |
| 6 | Edge Cases | OCC, Offline, Uploads | none | PLANNED |

## Interface Contracts
- Playwright tests run via `npx playwright test`.
