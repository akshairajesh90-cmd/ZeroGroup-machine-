---
name: zero-group-dev
description: >-
  Development runbook and architectural standards for Zero Group (heavy machinery ERP & fleet logistics).
  Use when authoring Next.js Server Actions, modifying Prisma models, implementing RBAC permission checks,
  handling offline-first PWA logic, applying GPS telemetry sanitization, or complying with db-guard safety policies.
---

# Zero Group Core Development Skill

This skill provides architectural rules, code patterns, and procedural checklists for building, modifying, and maintaining the **Zero Group** ERP platform.

---

## 1. 3-Layer RBAC Enforcement

Zero Group enforces role-based access control across 3 mandatory boundaries:
1. **Edge Middleware (`src/middleware.ts`)**: Evaluated before compute; validates JWT session claims.
2. **Server Actions (`src/lib/serverAuth.ts`)**: Enforced inside every server action with `requireAuth`.
3. **UI Components**: Conditional rendering based on active session claims.

### Role Hierarchy
- **OWNER**: Full system authority, payroll settlement finalization, wage overrides, sensitive incidents.
- **ADMIN**: Operations management, machinery catalog, fleet tracking, customer accounts.
- **STAFF**: Daily dispatch scheduling, booking intake, order assignments, basic adjustments (≤ ₹500).
- **DRIVER**: PWA order acceptance, live navigation, cash delivery collection.
- **OPERATOR**: PWA field diary logging, equipment inspection, machine hour meters.

### Server Action Auth Pattern
Always invoke `requireAuth` at the start of any Server Action:

```typescript
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";

export async function sampleProtectedAction() {
  // Returns AuthContext: { userId, email, role, employeeId }
  const auth = await requireAuth({
    allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF],
    redirectOnFail: false // throw AuthError instead of redirecting in actions
  });
  // ... proceed with business logic
}
```

---

## 2. Standardized Server Action Protocol

Every Server Action **must** return the strongly typed `ActionResult<T>` envelope defined in `src/lib/action-result.ts`:

```typescript
export type ActionResult<T = void> =
  | { success: true; data: T; error?: never; code?: never }
  | { success: false; error: string; code?: string; data?: never };
```

### Action Guidelines
1. **Validate inputs with Zod**: Parse incoming `formData` or raw objects using strict Zod schemas.
2. **Optimistic Concurrency Control (OCC)**:
   - For update mutations on stateful records (`DailyDispatch`, `Settlement`), require `version: number`.
   - Update query must include `where: { id, version }` and increment `version: { increment: 1 }`.
   - If `count === 0`, return `errorResult("Record modified by another user. Please refresh.", "OCC_CONFLICT")`.
3. **Safe Error Handling**: Wrap execution in `safeAction()` or use explicit try/catch returning `errorResult()`.

See the complete template in [server-action-template.md](./references/server-action-template.md).

---

## 3. Database Safety Guards (`db-guard.ts`)

To protect production and staging data from accidental deletion or modification:
- **`assertSafeDatabaseContext(scriptName, { isDestructive: true })`** is mandatory in any data-mutating script or test teardown.
- **Rules enforced by `db-guard.ts`**:
  - `NODE_ENV` cannot be `production`.
  - Database host must be localhost/loopback (`127.0.0.1`, `localhost`, `::1`).
  - Target database name must end with `_test`, OR require explicit opt-in flag: `ALLOW_DESTRUCTIVE_DEV_SEED=true`.
- **Never mutate the DB during `npm run build`**: Builds run `prisma generate && next build` and must remain completely side-effect free.

---

## 4. Geolocation Pipeline & Kerala GIS Operations

When handling GPS telemetry from drivers or site operators:
1. **Horizontal Accuracy Check**: Reject readings where `accuracy > 100` meters.
2. **Velocity Sanity Filter**: Calculate velocity between consecutive pings; reject pings exceeding `130 km/h` to eradicate satellite bounce.
3. **SSRF Link Protection**: Use `src/lib/geo-server.ts` link resolver for parsing Google Maps or shortened location URLs; never issue unvalidated external requests from edge routes.
4. **Offline Resilience**: Mobile clients buffer pings in Dexie IndexedDB when offline and drain to the server in FIFO batches upon reconnection.

---

## 5. Architectural Checklist Before Committing

- [ ] Does the Server Action check permissions via `requireAuth`?
- [ ] Does the Server Action return `ActionResult<T>`?
- [ ] Are state mutations protected by OCC `version` incrementing where required?
- [ ] Do data scripts call `assertSafeDatabaseContext()`?
- [ ] Do all local tests pass using the isolated test database (`node scripts/db-test.js ...`)?
- [ ] Are UI components keyboard accessible and contrast-checked (WCAG 2.1 AA)?

---

## Reference Documents
- [Server Action Template](./references/server-action-template.md)
- [RBAC Permission Matrix](./references/rbac-matrix.md)
