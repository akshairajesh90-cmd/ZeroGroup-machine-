# Zero Group RBAC Permission Matrix

| Resource / Action | OWNER | ADMIN | STAFF | DRIVER | OPERATOR |
|:---|:---:|:---:|:---:|:---:|:---:|
| **God Mode & Wage Overrides** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Finalize Weekly Settlements** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Resolve Flagged Incidents** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Daily Dispatch Creation** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Invoice Adjustments (≤ ₹500)** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Invoice Adjustments (> ₹500)** | ✅ (Approval) | PENDING | PENDING | ❌ | ❌ |
| **Driver Order Acceptance & Map** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Operator Field Diary Logging** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **GPS Telemetry Submission** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Machine Catalog & Pricing Config** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Dynamic CMS & Website Settings** | ✅ | ✅ | ❌ | ❌ | ❌ |

## Implementation Notes
- Enforce in Edge Middleware: `src/middleware.ts`
- Enforce in Server Actions: `requireAuth({ allowedRoles: [...] })`
- UI Conditional display: check `session.user.role`
