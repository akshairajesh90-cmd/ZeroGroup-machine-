# Handoff: Admin Portal Tests Strategy

## Observation
- `simulation-blueprint.md` calls for end-to-end testing of Admin Portal pages (`/admin/*`): Dashboard, Dispatch, Cash/Expenses, and Settlements.
- Based on the codebase inspection:
  - **Dashboard**: Exists at `src/app/admin/dashboard` (`/admin/dashboard`). It renders metrics (Projected Revenue, Cash Bleed, Fleet Utilization) and an Approval Queue.
  - **Dispatch**: There is no direct `/admin/dispatch`. Admins utilize the Staff Portal at `/staff/dispatch` (`src/app/staff/dispatch/page.tsx`). Dispatch creation uses the `CreateDispatchModal.tsx` / `CreateDispatchModalV2.tsx` components under `src/components/dispatch`.
  - **Cash & Expenses**: Admin cash/expense monitoring corresponds to `/staff/cash`, `/staff/expenses`, and manual adjustments (Bonuses/Penalties) are specifically managed at `/owner/adjustments`.
  - **Settlements**: Managed via `/owner/settlements` (`src/app/owner/settlements/SettlementClient.tsx`). Mutations utilize Next.js Server Actions in `src/actions/settlement.ts` (e.g., `finalizeSettlement`). The action explicitly checks `if (settlement.version !== parsed.currentVersion)` for OCC.

## Logic Chain
- To implement these tests in `tests/admin_portal.spec.ts`:
  1. **Dashboard**: Navigate to `/admin/dashboard`, assert visibility of the "Executive Command" header and aggregate metric cards.
  2. **Dispatch**: Navigate to `/staff/dispatch`. Trigger the new dispatch modal, fill in "Mixer" + "Lift" details, select a Driver and Operator, and submit. Verify the dispatch appears as `PENDING`.
  3. **Cash/Expenses**: Navigate to `/owner/adjustments` and test the creation form for a `ManualAdjustment`, verifying that it auto-approves (if <= ₹500) or stays pending.
  4. **Settlements & OCC**: Navigate to `/owner/settlements`. Locate a draft settlement. To test the OCC version lock:
     - Load the UI (which caches `currentVersion` in the client).
     - Mid-test, use `await prisma.settlement.update({ where: { id: ... }, data: { version: { increment: 1 } } })` to simulate a concurrent modification.
     - Click the UI's "Finalize" button.
     - Assert that the server action throws an OCC error ("Data has changed. Please refresh and try again.") instead of finalizing.

## Caveats
- The blueprint references `/admin/dispatch` and `/admin/settlements`, but the implemented layout splits these into `/staff/dispatch` and `/owner/settlements`. The tests must target the actual implementation URLs.
- Server Actions handle API calls. Mocking Network requests via Playwright's `page.route` is difficult for Server Actions; simulating race conditions by interacting directly with the DB via Prisma in the test (Playwright runs Node.js) is the best approach for the OCC test.
- The test suite must log in with a user possessing the `OWNER` or `ADMIN` role, using the established pattern from `massive_concurrency.spec.ts`.

## Conclusion
The implementation strategy is to write `tests/admin_portal.spec.ts` using Playwright. The worker will need to align the test navigation to the actual `/owner` and `/staff` routes instead of the idealized `/admin` routes. OCC validation should be reliably reproduced by artificially bumping the DB version using Prisma before triggering the UI Finalize button.

## Verification Method
1. The worker runs `npx playwright test tests/admin_portal.spec.ts` (or standard `npm run test` script).
2. Verification succeeds if all 4 scenarios pass, especially confirming that the OCC constraint prevents the "Finalize" action when the DB version changes mid-interaction.
