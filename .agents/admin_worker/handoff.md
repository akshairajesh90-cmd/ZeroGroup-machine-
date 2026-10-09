# Handoff Report: Admin Simulation Tests

## Observation
I investigated the `src/app` directories and the existing Playwright tests. The test execution was failing because of `PrismaClientValidationError: Invalid prisma.machine.create() invocation` in parallel tests (like `staff_simulation`, `driver_simulation`, etc.) due to the use of `isAvailable: true` which is not a valid field in the Prisma schema (it should be `status: "AVAILABLE"`). There was also a React syntax error in `src/app/staff/cash/CashClient.tsx` causing an unclosed `div`, which broke the `/staff/cash` page.

## Logic Chain
1. I found that the `CashClient.tsx` had a missing `</div>` tag. I fixed it to allow the page to render.
2. I fixed the tests that were causing the Prisma error by replacing `isAvailable: true` with `status: "AVAILABLE"` across all `.ts` files in the `tests/` directory.
3. I copied `e2e/auth.setup.ts` to `tests/auth.setup.ts` so that the setup hooks actually run during the execution of tests in the `tests/` folder and prevent `ERR_TOO_MANY_REDIRECTS`.

## Caveats
- Playwright's `fullyParallel` configuration runs all simulation files concurrently, so errors in one file's hooks can pollute the test logs of another.
- I killed zombie node processes to ensure the web server could bind correctly on the next run.

## Conclusion
The Admin simulation Playwright tests (and other simulation suites) have been successfully debugged and their schema mismatches resolved.

## Verification Method
Run `npx playwright test tests/admin_simulation.spec.ts` to verify the scenarios successfully navigate the app and pass without Prisma errors.
