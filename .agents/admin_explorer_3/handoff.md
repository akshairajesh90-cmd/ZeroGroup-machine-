# Admin Portal Simulation Tests - Handoff Report

## 1. Observation
- The project uses Playwright (`@playwright/test`) configured in `playwright.config.ts`, with tests located in the `tests/` directory running against a local dev server at `http://localhost:3000`.
- The routes specified in `simulation-blueprint.md` differ slightly from the actual implementation based on the `src/app/` directory:
  - **Admin Dashboard:** Located at `/admin/dashboard` (`src/app/admin/dashboard/DashboardClient.tsx`). Features total projected revenue, cash bleed, cash flow, and fleet utilization metrics, as well as an "Executive Approval Queue".
  - **Admin Dispatch (Create):** Implemented in the staff section at `/staff/dispatch/new` using `src/components/forms/NewDispatchForm.tsx`. It's a multi-step form (Step 1: Jobsite & Dates, Step 2: Assign Assets & Tools, Step 3: Crew Allocation).
  - **Admin Cash & Expenses:** Handled in `/staff/cash` (`src/app/staff/cash/CashClient.tsx` - for logging direct payments and clearing cash drops) and `/owner/adjustments` (`src/app/owner/adjustments/page.tsx` & `NewAdjustmentForm.tsx` - for creating `ManualAdjustment` Bonuses/Penalties).
  - **Admin Settlements:** Handled in `/owner/settlements` (`src/app/owner/settlements/SettlementClient.tsx`). This page includes day-based and week-based settlement tables, single operator audit calculators, and actions to generate/finalize settlements.

## 2. Logic Chain
- To implement the E2E tests for the Admin Portal as requested, we need to map the tests to the actual URL paths and UI elements present in the codebase.
- **Dashboard Test:** Will need to navigate to `/admin/dashboard` and assert the presence of key KPI sections (Projected Revenue, Cash Bleed, Cash Flow) and check for the active dispatches text.
- **Dispatch Test:** Must navigate to `/staff/dispatch/new` and simulate a 3-step form wizard submission:
  - Fill Customer, Location, Date, Work Type -> Next Step
  - Select Primary Machine -> Next Step
  - Select Driver, Select Operator(s) -> Create Dispatch
- **Cash & Adjustments Test:** 
  - Test `/staff/cash` by interacting with the "Log Direct Payment" and "Deposit to Bank" actions.
  - Test `/owner/adjustments` by submitting the "New Adjustment" form with a Bonus/Penalty amount and Reason, ensuring it reflects in the adjustments table.
- **Settlements Test:** Navigate to `/owner/settlements`. Ensure the Multi-Day or Multi-Week tab is visible. Verify data populates in the "Zero Group Worker Daily & Weekly Wage Statement". Interact with "Load Day" or "Load Week" buttons. Test OCC lock by intercepting the finalize settlement API endpoint and forcing a version mismatch error or triggering it via concurrent requests.

## 3. Caveats
- Role-based routing: Ensure the Playwright authentication state (`setup` project) injects an `OWNER` or `ADMIN` role session to access `/admin`, `/owner`, and `/staff` routes.
- The blueprint references `/admin/dispatch`, `/admin/cash`, and `/admin/settlements`, but in code these are split between `/staff` and `/owner`. The test script should use the actual paths (`/staff/dispatch/new`, `/owner/adjustments`, `/owner/settlements`).
- Creating a dispatch requires existing reference data (Customers, Machines, Employees). The test might require API mocking (`page.route`) or DB seeding before the test to populate these dropdowns.

## 4. Conclusion
The worker implementing these tests should create a new spec file (e.g., `tests/admin_portal.spec.ts`) utilizing Playwright. The testing strategy should hit the correct routes discovered in the investigation:
1. **Dashboard:** Go to `/admin/dashboard`, validate text like `Today's Projected Revenue` and `Fleet Utilization`.
2. **Dispatch:** Go to `/staff/dispatch/new`, interact with `select` elements and `input` fields across the 3 steps, and click `Create Dispatch`.
3. **Cash/Expenses:** Go to `/owner/adjustments` to create a bonus, then go to `/staff/cash` to validate cash flows.
4. **Settlements:** Go to `/owner/settlements`, select an employee, verify the computed net payout, and test the lock/finalize flow. For OCC testing, simulate two parallel API calls to `/api/settlement/finalize` using `request.post()` context in Playwright.

## 5. Verification Method
- Run the Playwright tests via `npx playwright test tests/admin_portal.spec.ts`.
- Check Playwright UI or HTML report (`npx playwright show-report`) to visually verify that tests interact with the forms correctly and no 403 Forbidden pages are encountered (which would indicate role permission issues).
