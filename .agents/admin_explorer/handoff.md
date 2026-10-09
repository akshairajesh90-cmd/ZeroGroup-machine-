# Handoff Report: Admin Portal Simulation Tests

## Observation

1. **Dashboard (`/admin/dashboard`)**: The Admin Dashboard is located at `src/app/admin/dashboard/DashboardClient.tsx`. It displays total entities, fleet utilization, and financial aggregates (`projectedRevenue`, `cashBleed`, `todayCashFlow`).
2. **Dispatch, Cash, Expenses (`/staff/*`)**: There are no `src/app/admin/dispatch`, `cash`, or `expenses` folders. As seen in `src/app/owner/layout.tsx` (the Admin/Owner Layout), the Owner uses the "Staff Portal" for these features. Hence, `/admin/dispatch` maps logically to `/staff/dispatch`, `/admin/cash` to `/staff/cash`, and `/admin/expenses` to `/staff/expenses`. 
3. **Settlements (`/owner/settlements`)**: The week-end settlement logic is in `src/app/owner/settlements/page.tsx` and `SettlementClient.tsx`. It pulls pending adjustments and generates a weekly operator/driver payroll draft.
4. **Manual Adjustments (`/owner/adjustments`)**: `ManualAdjustment` entries (bonuses/penalties) are created in `src/app/owner/adjustments`.
5. **Existing E2E Skeleton**: `e2e/admin.spec.ts` defines a test skeleton calling URLs like `/admin/dispatch`, `/admin/cash`, `/admin/settlements`. These currently do not match the Next.js directory structure (`/staff/dispatch`, `/staff/cash`, `/owner/settlements`), so the tests will fail with 404s if strictly following the route names in `e2e/admin.spec.ts`.

## Logic Chain

1. To test the features requested in `simulation-blueprint.md` for the "Admin" persona, the worker must update `e2e/admin.spec.ts` to navigate to the correct actual routes (`/admin/dashboard`, `/staff/dispatch/new`, `/staff/cash`, `/staff/expenses`, `/owner/adjustments`, `/owner/settlements`).
2. The Admin (Owner) uses `owner@ironrent.test` (stored in `playwright/.auth/admin.json` by `auth.setup.ts`). This auth context will have permission for all these routes.
3. For `/admin/dashboard`, the test should assert on text elements corresponding to the metrics (e.g. `Today's Projected Revenue`, `Fleet Utilization`).
4. For Dispatch creation, navigating to `/staff/dispatch/new` will render the `NewDispatchForm`. The test must select a Customer, Machine (Mixer/Lift), and Employee (Driver/Operator) and click "Create Dispatch", expecting a redirect or success state.
5. For Cash & Expenses, `ManualAdjustment` should be tested via the `/owner/adjustments` route (or via the modal in `/owner/settlements`), filtering by employee and logging a bonus or penalty.
6. For Settlements (`/owner/settlements`), the test should simulate hitting "Load Week", selecting an operator, and calling the lock/finalize function (validating OCC and final payroll calculation).

## Caveats

- We did not deeply check the exact DOM elements (e.g. data-testid attributes) in the components, so the implementer will need to use Playwright text locators like `page.getByText(...)` or standard `locator('button:has-text("...")')`.
- The `e2e/admin.spec.ts` currently has a hardcoded array `staticPages = ['/admin/employees', '/admin/cash', ...]`. The implementer must rewrite this to use the actual paths (`/owner/employees`, `/staff/cash`, `/owner/settlements`, etc.).

## Conclusion

The implementer should rewrite `e2e/admin.spec.ts` (or create a new `admin-simulation.spec.ts`) using the following strategy:
1. **Dashboard**: Navigate to `/admin/dashboard` and `expect(page.getByText("Today's Projected Revenue")).toBeVisible()`.
2. **Dispatch**: Navigate to `/staff/dispatch/new`, fill `NewDispatchForm`, and submit.
3. **Cash/Expenses/Adjustments**: Navigate to `/owner/adjustments` to create a `ManualAdjustment`. Test filtering.
4. **Settlements**: Navigate to `/owner/settlements`. Target the week-based settlement, verify `Final Net Weekend Payout` elements, and simulate the "Finalize" or "Lock" button interaction.

## Verification Method

- Check the implementation by running `npx playwright test e2e/admin.spec.ts` (or the new test file name).
- Tests should pass without 404 navigation errors.
- Visual inspection of the test trace (`npx playwright show-trace`) to ensure forms were correctly filled and submitted.
