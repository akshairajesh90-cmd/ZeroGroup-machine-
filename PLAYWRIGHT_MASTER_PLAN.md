# Zero Group ERP — Playwright E2E Master Test Plan (Agent Prompt)

> Paste this whole file to your AI coding agent (Claude Code / Cursor) as the task prompt, or save it in the repo as `PLAYWRIGHT_MASTER_PLAN.md` and tell the agent: *"Implement this plan fully. Work suite by suite and tick every checkbox."*
> Source of truth: `zero_group_full_system_file_blueprint.md` (Next.js 14 App Router, NextAuth v5, Prisma 46 models, PWA `/sw.js` + IndexedDB offline queues).

---

## 0. YOUR ROLE AND MISSION

You are a senior QA automation engineer. Build a **complete Playwright (TypeScript) end-to-end test suite** for the Zero Group Heavy Machinery ERP.

Cover **all 5 portals** (ADMIN, OWNER, STAFF, DRIVER, OPERATOR) plus the public site, with:
1. **Every page and sub-page** (including dynamic routes like `[id]`, `[dispatchId]`, `[customerId]`, `[invoiceId]`).
2. **Every button, modal, form, toggle, tab, filter, dropdown, table action** (blueprint §9 catalog + §3–§7 component lists).
3. **Every user role** and **role-boundary** (who can / cannot open what).
4. **Multi-user cross-role journeys** (staff books → driver delivers → operator pours → billing → cash → settlement → owner approves).
5. **All 12 field scenarios** from blueprint §10 (GPS canopy, keypad phone, cellular blackout, fraud attempt, fuel theft, breakdown, rain, shortage, disputed bags, missing tool, labor mismatch, MVD check).
6. **Negative, validation, security, offline/PWA, mobile-responsive, accessibility, and console-error checks.**

### Non-negotiable working rules
- Do **not** invent selectors. **Open the real app, inspect the DOM**, then write locators. Prefer `getByRole`, `getByLabel`, `getByText` (English **and** Malayalam labels from §9), then `data-testid`. If a stable hook is missing, add a `data-testid` to the component and list it in `docs/testid-additions.md`.
- No `waitForTimeout` sleeps. Use web-first assertions and `expect.poll`.
- Every test is **independent and idempotent** (own data, cleaned up or uniquely named with `E2E-${Date.now()}`).
- Every test **fails on**: uncaught page errors, `console.error`, and any `5xx` network response (fixture in §2.4). Specifically watch for Next.js "Decimal / only plain objects can be passed to Client Components" serialization errors (blueprint §1.1-3).
- Verify **DB/side-effects**, not just UI: after each mutating action assert the expected row/status change (via a test-only helper using Prisma or an API read) — the "DB Impact" column in blueprint §9 tells you what to assert.
- Work in this order: **Setup → RBAC → Admin/Owner → Staff → Driver → Operator → Cross-role journeys → Field scenarios → Offline/PWA → Security → Non-functional**. After each suite, run it, fix flakiness, commit.
- At the end produce `docs/COVERAGE_REPORT.md`: every checkbox in this file → test file + test title, or "BLOCKED: reason".

---

## 1. PROJECT SETUP

### 1.1 Folder layout
```
e2e/
  playwright.config.ts
  global-setup.ts                 # seeds DB + logs in each role, saves storageState
  fixtures/
    base.ts                       # extended test: errorWatcher, gps, offline, db helpers
    roles.ts                      # credentials + storageState paths
    gps.ts                        # mockGps(), movePath()
    offline.ts                    # goOffline(), goOnline(), readIdb()
    db.ts                         # prisma helpers: seed*, expectRow, cleanup
    data.ts                       # coordinates, rates, names (see §2.2)
  pages/                          # optional POMs: AdminSidebar, StaffSidebar, DriverNav, OperatorNav, DocketCanvas...
  tests/
    00-setup-smoke/
    01-auth-rbac/
    02-admin-owner/
    03-staff/
    04-driver/
    05-operator/
    06-journeys/
    07-field-scenarios/
    08-offline-pwa/
    09-security-negative/
    10-nonfunctional/
  .auth/                          # storageState json (gitignored)
```

### 1.2 `playwright.config.ts` — projects (one per persona/device)
| Project | Device | Storage state | Notes |
|---|---|---|---|
| `setup` | — | — | runs `global-setup.ts` |
| `admin` | Desktop Chrome 1440×900 | `.auth/admin.json` | tests in `02-admin-owner/admin-*` |
| `owner` | Desktop Chrome | `.auth/owner.json` | owner-only pages + owner billing/settlements |
| `staff` | Desktop Chrome | `.auth/staff.json` | dispatcher portal |
| `staff-tablet` | iPad (gen 7) | staff | sidebar/hamburger behaviour |
| `driver` | Pixel 7 (Chromium) | `.auth/driver.json` | `geolocation`, `permissions:['geolocation','camera']`, `serviceWorkers:'allow'` |
| `driver-ios` | iPhone 14 (WebKit) | driver | iOS install prompt |
| `operator` | Pixel 7 | `.auth/operator.json` | same + canvas/touch |
| `public` | Desktop | none | landing page, login pages, redirects |

Global options: `trace:'retain-on-failure'`, `video:'retain-on-failure'`, `screenshot:'only-on-failure'`, `retries: CI?2:0`, `workers: CI?4:2`, `timezoneId:'Asia/Kolkata'`, `locale:'en-IN'`, `reporter:[['html'],['junit'],['list']]`.

### 1.3 Test accounts to seed (global-setup)
| Key | Role | Notes |
|---|---|---|
| `admin` | ADMIN | full admin |
| `owner` | OWNER | owner-only pages |
| `staff` | STAFF | dispatcher |
| `staff2` | STAFF | to test Staff Log audit |
| `driver1` | DRIVER | smartphone, has a shift-free vehicle |
| `driver2` | DRIVER | **keypad phone senior driver** (no GPS pings) — scenario 2 |
| `operator1` | OPERATOR | internal operator |
| `contractor1` | OPERATOR (tag `CONTRACTOR`) | subcontractor operator |
| `forgotpin` | DRIVER/OPERATOR | for PIN reset flow |

Also seed: 3 customers (one with low credit limit, one with GSTIN), 2 concrete mixers (10/7), 1 hoist, 3 vibrator needles (40mm, 60mm…), 2 flatbed trucks (`KL-35-D-4521`, `KL-05-AB-1200`) one with **RC/insurance/PUC expiring in ≤15 days**, `WorkTypeRate` rows (per-bag, floor lift, overtime, `waitingHourlyRate` ₹450), `EmployeeRoleRate`, `SystemSettings` (Pala yard `9.7118, 76.6853`), 1 project, 1 sub-leader, sample dispatches in **every status** (`PENDING, ACCEPTED, EN_ROUTE, IN_PROGRESS, COMPLETED/DELIVERED`), unverified + verified + deposited cash collections, invoices in `UNPAID/PARTIAL/PAID`, a soft-deleted dispatch, a pending password-reset request, a pending salary advance.

> ⚠️ **Unknown to confirm with the human (ask before guessing):** the exact login URL/form for ADMIN/OWNER/STAFF/DRIVER (blueprint only specifies `/operator/login` with 10-digit mobile + 4-digit PIN and says unauthorized access redirects to `/`); how test DB is reset; whether a test-only seed endpoint exists. If missing, create `scripts/e2e-seed.ts` (Prisma) and an `E2E_MODE` guard.

### 1.4 Shared fixtures (implement exactly)
- **`errorWatcher`** (auto-fixture): collects `pageerror`, `console.error`, `response.status()>=500`; fails test at teardown. Allow-list file `e2e/allowlist.json` for known benign noise (must be justified).
- **`mockGps(page,{lat,lon,accuracy,speed})`**: `context.setGeolocation` + permissions; **`movePath(page, points[], intervalMs)`** to simulate driving.
- **`goOffline(context)` / `goOnline(context)`**: `context.setOffline()` + dispatch `online/offline` events.
- **`readIdb(page, store)`**: read IndexedDB stores `offline_dockets_queue`, `offline_location_pings_queue`.
- **`db`**: `expectDispatchStatus(id,status)`, `expectRow(table,where)`, `expectAuditLog(actionType)`, `countRows`.
- **`signature(page, canvasLocator)`**: draw a stroke with `page.mouse` / touch events on the HTML5 canvas.
- **`api.pingLocation()`**: POST `/api/location/ping` helper for server-side checks.
- **`loginAs(role)`** for tests that need to switch users mid-test (multi-context).

---

## 2. TEST DATA CONSTANTS (use these in tests)

| Name | Value |
|---|---|
| Pala yard | `9.7118, 76.6853` |
| Poonjar site (scenario 4) | `9.6800, 76.7800` |
| Operator "home" (fraud) | `9.7150, 76.6870` (≈11 km away → must be rejected) |
| Teekoy breakdown | `9.6920, 76.8110` |
| Proximity guard | `100 m` (operator pin) |
| Autopilot thresholds | leave yard `>250 m` at `≥15 km/h` → `EN_ROUTE`; within `100 m` of site → `IN_PROGRESS` |
| Cash retention alert | `> ₹25,000` held `> 24 h` |
| Doc-expiry alert | within `15 days` |
| Stationary en-route alert | `> 30 min` while `EN_ROUTE` outside yard/site |
| Fuel anomaly | 38 km / 50 L = `0.76 km/L` vs baseline `3.5–5.0 km/L` |
| Waiting charge | 3.0 h × ₹450 = ₹1,350 |
| Bag increments | `+10 +25 +50 -1`; scenario 9 timeline 25+25+25+25+15 = 115 |
| GST on invoice | CGST 9% + SGST 9%; GSTIN `32AAAAZ0000A1Z5` |
| Offline ping cap | 200 pings in `offline_location_pings_queue` |
| Tracker intervals | driver 15 s, operator 60 s |
| Badge polling | 20 s (`getPendingPasswordResetCountAction`) |

---

## 3. SUITE 01 — AUTH, SESSION & RBAC (all roles × all routes)

### 3.1 Login (every role)
- [ ] AUTH-001 Public landing page `/` renders (`PublicLandingClient`): hero, value props, machinery catalog cards, testimonials, contact/CTA, no console errors.
- [ ] AUTH-002 ADMIN valid login → lands `/admin/dashboard`.
- [ ] AUTH-003 OWNER valid login → owner landing (`/owner/dashboard`).
- [ ] AUTH-004 STAFF valid login → `/staff/dashboard`.
- [ ] AUTH-005 DRIVER valid login → `/driver/home`.
- [ ] AUTH-006 OPERATOR login via `/operator/login` (10-digit mobile + 4-digit PIN keypad) → `/operator/home`.
- [ ] AUTH-007 Invalid password / wrong PIN → error shown, no session.
- [ ] AUTH-008 Operator keypad: every digit button 0–9, backspace/clear, mobile field accepts only 10 digits, PIN masks, large tap targets visible at 360px width.
- [ ] AUTH-009 "Forgot PIN? Request Reset" button creates reset request (see SEC-PIN flow §11).
- [ ] AUTH-010 Sign out (Admin sidebar, Staff sidebar, Operator header, Driver) → JWT cleared, back button does not restore session, `/admin/*` redirects to `/`.
- [ ] AUTH-011 Session persists across reload; session expiry handled gracefully.
- [ ] AUTH-012 `/admin` redirects to `/admin/dashboard` (admin/page.tsx redirector).

### 3.2 RBAC matrix (table-driven, one test per cell)
Visit each route as each role; expected = **ALLOW** (page loads, correct heading) or **DENY** (server redirect to `/`).

| Route prefix | ADMIN | OWNER | STAFF | DRIVER | OPERATOR | anon |
|---|---|---|---|---|---|---|
| `/admin/*` | ALLOW | ALLOW | DENY | DENY | DENY | DENY |
| `/owner/*` | ALLOW? | ALLOW | DENY | DENY | DENY | DENY |
| `/staff/*` | ALLOW | ALLOW | ALLOW | DENY | DENY | DENY |
| `/driver/*` | DENY (unless impersonating) | DENY | DENY | ALLOW | DENY | DENY |
| `/operator/*` | DENY (unless impersonating) | DENY | DENY | DENY | ALLOW | DENY (except `/operator/login`) |

> Blueprint says admin layout allows `ADMIN` **or** `OWNER`, staff layout allows `STAFF/ADMIN/OWNER`. For `/owner/*` as ADMIN (the `?`), **verify real behaviour and document it** — sidebar links `Weekly Cash Flow → /owner/ledger` and `Trash & Recovery → /owner/trash` are shown to admins, so test both.

- [ ] RBAC-001…RBAC-0NN generate the full matrix for **every route listed in §4–§8 of this file** (not only prefixes). At minimum one DENY test per portal + one ALLOW per page.
- [ ] RBAC-OWNER-ONLY: verify owner-exclusive pages (`/owner/trash` purge dialog, `/owner/billing` bad-debt write-off, `/owner/settlements` authorization, `/owner/employees` EditWageModal, `/owner/staff-log`) as ADMIN → document allow/deny.
- [ ] RBAC-DIRECT-URL: driver opens `/staff/dispatch` by typing URL → redirected `/`; operator opens `/driver/home` → `/`.
- [ ] RBAC-API: call server actions / `/api/*` endpoints with wrong-role session → 401/403 (no data leak).

---

## 4. SUITE 02 — ADMIN & OWNER PORTAL

### 4.1 Admin shell (`AdminSidebar.tsx`)
- [ ] ADM-SB-001 Sidebar shows **5 groups / 20 routes** with correct labels, icons, hrefs: Morning Briefing (Dashboard, Operations Chat, ID & Passwords Hub, Analytics and Projects, Crew Directory) · Dispatch & Ops (Dispatch Board, Daily Dispatches, Live Operations) · Fleet & Logistics (Fleet and Machines, Tools Inventory, Asset Maintenance) · Closing & Finance (Expenses and Store, Weekly Cash Flow, Cash Collections, Billing, Invoices, Weekly Settlements, Salary Advances, Manual Adjustments) · Portals & System (Office Staff Portal, Driver Mobile App, Field Operator App, Trash & Recovery, Public Website & Yard).
- [ ] ADM-SB-002 **Click every one of the 20 links** → correct URL, page heading, no error. (loop test)
- [ ] ADM-SB-003 Header: logo, portal indicator (`Admin Portal` vs `Owner Portal`), role badge correct per role.
- [ ] ADM-SB-004 Active-link highlight follows route.
- [ ] ADM-SB-005 **Pending-reset badge**: seed 1 pending reset → pulsating red badge on ID & Passwords Hub within 20 s (use `page.clock` fast-forward); resolve → badge disappears; custom event `reset-requests-updated` refreshes instantly.
- [ ] ADM-SB-006 Mobile (375px): floating button opens slide-over drawer; body scroll locked; **Tab / Shift+Tab trapped** inside drawer; **Escape** closes and returns focus to trigger button; backdrop click closes.
- [ ] ADM-SB-007 Sign-out button works.
- [ ] ADM-SB-008 Portal switch links open staff/driver/operator views (impersonation banner rules in §4.20).

### 4.2 Dashboard `/admin/dashboard` + `/owner/dashboard`
- [ ] ADM-DB-001 Revenue Hero card: INR format, equals sum of `cash_collections` with status `DEPOSITED` (assert against DB), 7-day trend indicator.
- [ ] ADM-DB-002 Fleet Utilization donut + progress bars equal counts by `AVAILABLE / RENTED / MAINTENANCE`.
- [ ] ADM-DB-003 Weekly Dispatch Volume bar chart renders 7 bars; values match DB.
- [ ] ADM-DB-004 Active-dispatch count = statuses `PENDING|ACCEPTED|EN_ROUTE|IN_PROGRESS` today.
- [ ] ADM-DB-005 Quick Action Bar: **New Booking**, **Open Live Map**, **Issue Advance**, **Reset Employee PIN** — each opens the right modal/page and can be closed (Esc / X / backdrop).
- [ ] ADM-DB-006 `/owner/dashboard` loads P&L overview (or redirects as designed).
- [ ] ADM-DB-007 Loading skeleton (`loading.tsx`) appears on slow network (throttle) then content.

### 4.3 Compliance Radar (`ComplianceRadar.tsx`) — 4 detectors × 2 buttons
- [ ] ADM-CR-001 **Stationary En-Route**: seed truck `EN_ROUTE`, pings stationary > 30 min outside yard/site → alert shown. Negative: inside yard or at customer site → no alert.
- [ ] ADM-CR-002 **Missing Pre-Start Checklist**: mixer on site, no `equipment_verification_logs` today → alert. After operator submits checklist → alert clears.
- [ ] ADM-CR-003 **Excess Cash Retention**: operator holds > ₹25,000 for > 24 h → alert. Exactly ₹25,000 / < 24 h → no alert (boundary).
- [ ] ADM-CR-004 **Document Expiry**: RC / Insurance / PUC expiring ≤ 15 days → alert; 16 days → none.
- [ ] ADM-CR-005 **Dismiss Alert / ഒഴിവാക്കുക** silences for 4 h (fast-forward clock 4 h → returns).
- [ ] ADM-CR-006 **Review Anomaly / Flag for Audit / പരിശോധിക്കുക** → `daily_dispatches.isFlagged=true` + `audit_logs` row (`flagDispatchForReviewAction`).
- [ ] ADM-CR-007 Same radar on `/staff/dashboard` (staff copy) behaves identically.

### 4.4 Operations Chat `/admin/chat` (`CompanyGroupChat.tsx`)
- [ ] ADM-CH-001 Load history; send message; appears for sender; **appears in staff, driver, operator chats** (multi-context) with sender role label.
- [ ] ADM-CH-002 Empty message blocked; very long message; emoji/Malayalam text; HTML/script injection rendered as text (XSS).
- [ ] ADM-CH-003 Real-time/polling delivery within expected interval; scroll to latest; unread behaviour.
- [ ] ADM-CH-004 Driver breakdown (scenario 6) posts an automatic urgent chat message.

### 4.5 ID & Passwords Hub `/admin/credentials` (`CredentialsHubClient.tsx`)
- [ ] ADM-CR-101 Lists all drivers/operators/staff with search/filter.
- [ ] ADM-CR-102 **Generate Temporary PIN / പുതിയ പിൻ നൽകുക** → 4-digit PIN shown once; `users.passwordHash` changed; `audit_logs` has admin ID; worker can log in with new PIN, old PIN fails.
- [ ] ADM-CR-103 **Approve pending reset requests** → request cleared, badge count decrements.
- [ ] ADM-CR-104 **Session revocation** → worker's active session is logged out on next request.
- [ ] ADM-CR-105 Staff-portal copy `/staff/credentials` — same PIN reset flow for staff role; staff cannot reset ADMIN/OWNER (verify rule).

### 4.6 Analytics `/admin/analytics` (+ `/staff/projects` link "Analytics and Projects")
- [ ] ADM-AN-001 `ProfitMarginChart` + `UtilizationPie` render with seeded data; tooltips/hover; legend toggles.
- [ ] ADM-AN-002 ROI per mixer, monthly diesel trend, customer profitability numbers equal DB aggregates.
- [ ] ADM-AN-003 Empty-data state (fresh DB) shows empty message, not a crash.

### 4.7 Dispatch Board (admin) `/admin/dispatch-board`
- [ ] ADM-DP-001 Read-only/override view lists dispatches; statuses visible; override actions available to admin.
- [ ] ADM-DP-002 Open dispatch → details; `DispatchActionHeader` quick actions (`EN_ROUTE`, `ARRIVED`, `COMPLETED`).
- [ ] ADM-DP-003 `DispatchForm` modal creates a dispatch (rapid scheduling).
- [ ] ADM-DP-004 Calendar view `DispatchCalendarView` (month/week toggle), table ledger `DispatchTableLedger` (sort, filter, export), grid cards.

### 4.8 Machinery & Crew Allocation `/admin/allocation`, `/owner/allocation`
- [ ] ADM-AL-001 Date-range picker changes matrix.
- [ ] ADM-AL-002 Drag-and-drop a machine to a builder/day → `saveAllocationMatrixAction` persists; reload keeps it.
- [ ] ADM-AL-003 Multi-day project allocation view.
- [ ] ADM-AL-004 Conflict case: same machine double-booked → blocked/warned.
- [ ] ADM-AL-005 `/owner/allocation` shows revenue forecast per machine.

### 4.9 Billing `/admin/billing` (+ print, receivables) and `/owner/billing`
- [ ] ADM-BL-001 Filter by `UNPAID / PARTIAL / PAID`; search.
- [ ] ADM-BL-002 **Generate Tax Invoice / ടാക്സ് ഇൻവോയ്സ് തയ്യാറാക്കുക** from completed dispatch → `invoices` + `invoice_items` rows; invoice number unique; totals = items + CGST 9% + SGST 9%.
- [ ] ADM-BL-003 Batch invoice generator for multiple dispatches.
- [ ] ADM-BL-004 `DispatchBillingModal` line items (mixer hire, lift charges, extra hours).
- [ ] ADM-BL-005 `updateInvoiceStatus`, `recordCustomerPayment`: partial → `PARTIAL`; full → `PAID`; over-payment rejected.
- [ ] ADM-BL-006 **Print page** `/admin/billing/print/[invoiceId]`: A4 layout contains letterhead, Pala address, GSTIN `32AAAAZ0000A1Z5`, customer address, bag counts, floor lift, CGST/SGST, RTGS bank details, signatory seal. `PrintButton` calls `window.print` (stub) ; `emulateMedia({media:'print'})` hides nav; PDF snapshot.
- [ ] ADM-BL-007 **Receivables** `/admin/billing/receivables`: aging buckets 0–30 / 31–60 / 60+; search; **Export CSV** download content check; **ReceivablePaymentModal** records wire/RTGS/cheque (cheque number required for cheque).
- [ ] ADM-BL-008 Owner billing: margin audit visible; **bad-debt write-off** with confirmation; ADMIN behaviour documented.
- [ ] ADM-BL-009 Invalid invoice id in print URL → 404/not-found page.

### 4.10 Salary Advances `/admin/advances`
- [ ] ADM-AD-001 Table with running balances, status badges (PENDING/APPROVED/REJECTED).
- [ ] ADM-AD-002 **Issue Cash Advance / അഡ്വാൻസ് നൽകുക**: employee picker, amount, `CASH`/`UPI`, notes → `salary_advances` row. Validation: amount ≤ 0, empty employee, non-numeric.
- [ ] ADM-AD-003 Approve / reject operator-requested advance (from §7 `RequestAdvanceButton`).
- [ ] ADM-AD-004 Approved advance appears as deduction in settlements and in worker's pay page.

### 4.11 Manual Adjustments `/admin/adjustments`
- [ ] ADM-AJ-001 **Apply Adjustment** form: employee, `BONUS`/`PENALTY`, amount, reason → `manual_adjustments` + `audit_logs`.
- [ ] ADM-AJ-002 **Reverse / അസാധുവാക്കുക** with confirm dialog → status `REVERSED`; cancel leaves unchanged; cannot reverse twice.
- [ ] ADM-AJ-003 Adjustment reflected in weekly settlement net pay (bonus +, penalty −).

### 4.12 Live Operations `/admin/live`, `/admin/live/map`
- [ ] ADM-LV-001 Telemetry table: drivers, last ping time, geofence state; updates when a driver pings (multi-context).
- [ ] ADM-LV-002 Map loads Leaflet tiles (mock tile route), truck markers, mixer markers, customer-site markers + geofence circles, breadcrumb trails.
- [ ] ADM-LV-003 Speed alert flag on over-speed ping; stationary alert.
- [ ] ADM-LV-004 Breakdown (scenario 6) → marker turns into flashing red SOS icon.
- [ ] ADM-LV-005 `MultiEntitySearchBar` filter vehicles/drivers/machines/sites; `DateRangeFilterBar` scrubbing; `PersonRouteModal` 12-h trail.
- [ ] ADM-LV-006 Route replay controls (play/pause/speed).

### 4.13 Settings
- [ ] ADM-ST-001 `/admin/settings/rates`: edit base rate per bag, lift surcharge per floor, overtime, waiting rate → save → new booking/docket uses new rates (cross-check with operator docket calculator).
- [ ] ADM-ST-002 Rates validation (negative/blank).
- [ ] ADM-ST-003 `/admin/settings/website`: edit Store Name/Address/**Latitude/Longitude** (yard) → `getYardLocation()` changes; fleet distance-to-depot recalculates in `/staff/fleet`; invalid lat/lon (>90 / >180) rejected.
- [ ] ADM-ST-004 Website CMS: add/edit/delete **catalog item** (title, desc, category, hire rate, image); add/edit/reorder **value props**; testimonials → verify on public `/` page.
- [ ] ADM-ST-005 Image upload (valid, oversize, wrong type).

### 4.14 Settlements & Owner Ledger
- [ ] ADM-SE-001 `/admin/settlements` Saturday payroll: gross wages from dockets, − fuel, − advances, ± adjustments, − external labor → net; numbers match hand-calc with seed.
- [ ] ADM-SE-002 Per-worker row expand; prepare pay packet; finalize locks the week (no further edits).
- [ ] ADM-OW-001 `/owner/ledger` Weekly Cash Flow: collections vs payouts, bank vs cash box filters, totals.
- [ ] ADM-OW-002 `/owner/settlements`: final authorization; **NEFT bank-file generation** download content check.
- [ ] ADM-OW-003 `ExternalLaborModal`: audit/approve outside labor payouts; reject inflated claim (scenario 11) → `audit_logs`.

### 4.15 Employees & Staff Log (owner)
- [ ] ADM-EM-001 `/owner/employees` table; filter by `DRIVER / OPERATOR / STAFF`; search.
- [ ] ADM-EM-002 **EditWageModal**: daily wage, trip allowance, overtime multiplier → saved; invalid values rejected; change visible in settlements.
- [ ] ADM-EM-003 `/owner/staff-log`: audit log of dispatcher actions; staff2 action (e.g., location override) appears with employee ID.

### 4.16 Documents (compliance) — admin actions
- [ ] ADM-DC-001 Upload / renew / verify RC, Insurance, PUC, Driving License (PDF/image); expiry date updates radar alert.

### 4.17 Staff Portal Bridge `/admin/staff`
- [ ] ADM-SP-001 Bridge opens staff operations desk without logout; return path works.

### 4.18 Trash & Recovery
- [ ] ADM-TR-001 `/admin/trash` lists soft-deleted dispatches. **Restore / വീണ്ടെടുക്കുക** → `isPendingDelete=false`, appears on board.
- [ ] ADM-TR-002 **Permanent Purge / പൂർണ്ണമായി നീക്കം ചെയ്യുക** → confirm → cascade delete across related rows (assert no orphans).
- [ ] ADM-TR-003 `/owner/trash` secondary confirmation dialog (type-to-confirm / double confirm); cancel keeps record.

### 4.19 Profile
- [ ] ADM-PF-001 `/admin/profile` (`UserProfileClient`) edit and save; validation.

### 4.20 Impersonation (`isImpersonating`)
- [ ] ADM-IM-001 Admin → "Driver Mobile App" / "Field Operator App" / "Office Staff Portal": `AdminReturnBanner` visible on every page; `ImpersonateExitButton` returns to admin.
- [ ] ADM-IM-002 During impersonation **all financial mutations are locked** (cash collection, advance, payment, invoice status) — buttons disabled or server rejects.
- [ ] ADM-IM-003 Session logged in `audit_logs` (start + end).
- [ ] ADM-IM-004 Non-financial field actions while impersonating (view only) behave per rules.

### 4.21 Pages reachable from the admin sidebar but living under `/staff/*`
Run the **Staff suite (§5)** as ADMIN **and** OWNER too for: `/staff/projects`, `/staff/directory`, `/staff/orders`, `/staff/dispatch`, `/staff/fleet`, `/staff/tools`, `/staff/maintenance`, `/staff/expenses`, `/staff/cash`, `/staff/invoices`, `/staff/settlements`. (Tag `@shared-admin`.)

---

## 5. SUITE 03 — STAFF (DISPATCHER) PORTAL

### 5.1 Shell (`StaffSidebar.tsx`, `MyProfileModal.tsx`)
- [ ] STF-SB-001 3 groups / 15 routes present with labels: Daily Ops & Money Flow (Dashboard, Dispatch Board, Daily Dispatches, Cash Collections, Expenses & Store, Billing & Invoices, Weekly Settlements) · Tools & Fleet Assets (Tools Inventory, Fleet & Machines) · Others (ID & Passwords Hub, Operations Chat & Crew, Crew Directory & Rates, Asset Maintenance, Live Operations Map, Compliance Docs).
- [ ] STF-SB-002 Loop-click all links → correct page, no errors.
- [ ] STF-SB-003 Hamburger on mobile/tablet; drawer open/close; active highlight; reset-request badge polling.
- [ ] STF-SB-004 Staff user card → **MyProfileModal**: edit phone, address, photo (`ProfilePhotoUploader`); validation; persists; avatar updates.

### 5.2 Dashboard `/staff/dashboard`
- [ ] STF-DB-001 Counters by status (PENDING/ACCEPTED/EN_ROUTE/IN_PROGRESS/COMPLETED) equal DB.
- [ ] STF-DB-002 **Live Truck Transit Card**: driver, plate, speed, destination; updates on new ping.
- [ ] STF-DB-003 **Cash Bags Pending Verification** card lists unverified envelopes; link/button goes to verify.
- [ ] STF-DB-004 **Tools Pending Return** card shows overdue tools.
- [ ] STF-DB-005 Direct actions: **Book New Order, Assign Truck, Checkout Tools, Verify Cash Bag** — each opens right flow.
- [ ] STF-DB-006 ComplianceRadar (see ADM-CR).

### 5.3 Order intake `/staff/orders` (`OrderIntakeForm.tsx`)
- [ ] STF-OR-001 Customer autocomplete (existing, new customer, no match); credit-limit warning for low-limit customer.
- [ ] STF-OR-002 `keralaGeoParser` parses localities ("Poonjar", "Teekoy", "Melukavu", "Erattupetta") into location.
- [ ] STF-OR-003 Work-type rate auto-populates quotation (bag rate, lift).
- [ ] STF-OR-004 **Book Dispatch / ഓർഡർ സ്ഥിരീകരിക്കുക** → `daily_dispatches` (+ `dispatch_machines`) created status `PENDING`.
- [ ] STF-OR-005 Validation: missing customer, past date, invalid phone, no machine.
- [ ] STF-OR-006 Orders table (`OrdersTable`): status pills, quick actions, pagination/search.
- [ ] STF-OR-007 `CreateDispatchModal` and `CreateDispatchModalV2` both create successfully.

### 5.4 Dispatch board `/staff/dispatch` (+ `/new`)
- [ ] STF-DS-001 Kanban columns PENDING → ACCEPTED → EN_ROUTE → IN_PROGRESS → COMPLETED; cards in right column.
- [ ] STF-DS-002 **Drag & drop** card between columns → `StatusChangeModal` (reason, transition guard) → `updateDispatchStatusAction`; illegal jump rejected.
- [ ] STF-DS-003 `DispatchActionHeader` **Advance Status / സ്റ്റാറ്റസ് മാറ്റുക**.
- [ ] STF-DS-004 **Crew assignment builder** (`CrewAllocationBoard`): assign driver + operator + helpers + truck + machine; double-booking a driver/truck blocked; sub-leader assignment.
- [ ] STF-DS-005 Machine attachment selector (mixer, hoist, vibrators); `DispatchTool` rows created.
- [ ] STF-DS-006 `EditDispatchModal`: change date, contractor phone, machinery tags → saved.
- [ ] STF-DS-007 Customer phone dialer link `tel:`.
- [ ] STF-DS-008 **SiteLocationButtons / SiteLocationPinModal** — "Update Site Location (On Behalf of Driver)": decimal coords **or** pasted Google Maps link; **reason mandatory**; saves `STAFF_OVERRIDE` weight 5; `audit_logs.actionType = LOCATION_UPDATE_ON_BEHALF` (scenario 2). Invalid coords/link rejected.
- [ ] STF-DS-009 `StaffFieldDiaryOverrideModal`: correct disputed bag count with mandatory audit reason; logged.
- [ ] STF-DS-010 `SiteLaborDisbursementReview`: compares helper wages vs company ceiling; approve/reject (scenario 11).
- [ ] STF-DS-011 Views: Calendar (month/week), Table ledger (sort/filter/export), Grid cards.
- [ ] STF-DS-012 `/staff/dispatch/new` (`NewDispatchForm`): multi-machine (2 mixers + 1 hoist + 3 vibrators) in one booking; validation; success redirect.
- [ ] STF-DS-013 Soft-delete a dispatch → appears in Trash.

### 5.4b Field diary `/staff/field-diary/[dispatchId]`
- [ ] STF-FD-001 Shows customer signature image, bag batch timestamps (`+25 @09:14 …`), floors, overtime; read-only; invalid id → not-found. (scenario 9)

### 5.5 Billing & invoices
- [ ] STF-BL-001 `/staff/billing/[dispatchId]` (`BillingClient`): shows docket data (bags, lift, overtime); add **machine extra hours**, **waiting charges** (3 h × ₹450 = ₹1,350), **diesel surcharge**; totals recalc live; save → invoice.
- [ ] STF-BL-002 `/staff/invoices` (`InvoicesDashboard`): filter `UNPAID/PARTIAL/PAID`; search.
- [ ] STF-BL-003 Row actions: **Print A4 Invoice**, **Record Wire Payment** (`DirectPaymentModal`), **Send WhatsApp Invoice** (assert `wa.me`/share URL opened, stub popup).
- [ ] STF-BL-004 `/staff/invoices/[customerId]` (`CustomerStatement`): lifetime dispatches, billed, received, outstanding balance = DB.
- [ ] STF-BL-005 `CollectPaymentButton` / `CollectPaymentModal` → `cash_collections` + `payment_records`.

### 5.6 Cash `/staff/cash`
- [ ] STF-CS-001 Unverified envelopes listed with collector, amount, date.
- [ ] STF-CS-002 **Verify Physical Cash / പണം ഉറപ്പാക്കുക** → status `VERIFIED`; amount mismatch handling.
- [ ] STF-CS-003 **Confirm Bank Deposit** with deposit-slip upload → `DEPOSITED`; wrong file type rejected; cannot deposit unverified.
- [ ] STF-CS-004 `CashCollectionForm` records on-site receipt.
- [ ] STF-CS-005 `/staff/reconciliation`: daily cash vs bank deposit; difference highlighted.
- [ ] STF-CS-006 `PettyCashClient` float reconciliation.

### 5.7 Expenses `/staff/expenses` (+ `/new`)
- [ ] STF-EX-001 Category filter `FUEL / MAINTENANCE / TOOLS / SITE_LABOR / PETTY_CASH`; totals.
- [ ] STF-EX-002 `/staff/expenses/new`: vendor, GST number (validate format), tax amount, receipt photo; submit → row; validation errors.
- [ ] STF-EX-003 `StaffExternalLaborButton` modal → outside helper wage from petty cash.
- [ ] STF-EX-004 Flagged fuel anomaly expense visible with non-accusatory text (scenario 5).
- [ ] STF-EX-005 Fleet-specific expense actions (`staff/fleet/expenses/actions`).

### 5.8 Fleet `/staff/fleet`
- [ ] STF-FL-001 Grid of machines + vehicles; filter by `AVAILABLE/RENTED/MAINTENANCE`; fuel efficiency; current site; distance to depot (straight + road).
- [ ] STF-FL-002 **AddMachineModal** ("Add Concrete Mixer / മെഷീൻ ചേർക്കുക"): asset tag, serial, engine brand (Kirloskar/Lombardini), purchase date, daily rate → `machines`; duplicate asset tag rejected; required fields.
- [ ] STF-FL-003 **AddVehicleModal** ("Add Carrier Truck / വാഹനം ചേർക്കുക"): `KL-..` reg format, chassis, fuel type, tank, odometer, insurance expiry → `vehicles`; duplicate reg rejected.
- [ ] STF-FL-004 `AssetMapClient` map with all assets + distance vectors from yard.
- [ ] STF-FL-005 `/staff/fleet/machine/[id]`: dispatch log, concrete volume, diesel history, maintenance history tabs; **EditMachineModal**; **MachineStatusToggle** cycles `AVAILABLE/RENTED/MAINTENANCE`; `MachineModal` multi-tab.
- [ ] STF-FL-006 `/staff/fleet/vehicle/[id]`: odometer log, km/L chart, shift logs, active dispatch; **EditVehicleModal** (registration, insurance, tyre log); **VehicleStatusToggle** (`AVAILABLE/IN_USE/MAINTENANCE`); `VehicleModal` multi-tab.
- [ ] STF-FL-007 Invalid `[id]` → not-found; fleet `error.tsx` boundary shows when DB errors (route-fail simulation).
- [ ] STF-FL-008 Machine set to MAINTENANCE disappears from dispatch assignment lists.

### 5.9 Live ops `/staff/live`, `/staff/live/map`
- [ ] STF-LV-001 Logistics table: status, last ping age, battery, speed, active delivery.
- [ ] STF-LV-002 `LiveMapClient`, `StaffLiveTransitClient` (speed monitor, stationary alerts), `UnifiedLiveOperationsClient` (search filters, route replays, breadcrumbs, speed anomaly flags, depot coordinate setting), `UnifiedMapInner` (SVG markers, OSRM polylines — mock `router.project-osrm.org`, geofence circles).
- [ ] STF-LV-003 Marker click popup (driver, plate, speed, dispatch); follow/zoom controls; fullscreen.
- [ ] STF-LV-004 SOS flashing marker after breakdown ticket.

### 5.10 Tools `/staff/tools`
- [ ] STF-TL-001 Catalog table with statuses.
- [ ] STF-TL-002 **AddToolModal** ("Register Tool / ഉപകരണം ചേർക്കുക") → `tools`; duplicate toolId rejected.
- [ ] STF-TL-003 **EditToolModal** serial, daily rent, replacement value.
- [ ] STF-TL-004 **ToggleToolStatusButton** `AVAILABLE ↔ CHECKED_OUT ↔ REPAIR`.
- [ ] STF-TL-005 **ToolDeploymentsModal**: location, contractor, return due date.
- [ ] STF-TL-006 **DeleteToolButton** write-off with confirm.
- [ ] STF-TL-007 **Checkout tools** to a dispatch (qty, due date) → `dispatch_tools`.
- [ ] STF-TL-008 **ToolReturnModal** ("Check-in Tool / തിരികെ വാങ്ങുക"): mark each as `RETURNED` / `MISSING` / damaged with note; MISSING → recovery ticket + liability note + next-day collection stop (scenario 10).

### 5.11 Maintenance `/staff/maintenance`
- [ ] STF-MT-001 **Open Repair Ticket / വർക്ക്ഷോപ്പ് ടിക്കറ്റ് എടുക്കുക** → `maintenance_tickets`.
- [ ] STF-MT-002 Assign mechanic; log spare parts + cost; mark `RESOLVED`; vehicle returns to `AVAILABLE`.
- [ ] STF-MT-003 Driver breakdown ticket (priority HIGH) appears at top.

### 5.12 Workforce
- [ ] STF-WF-001 `/staff/crew` (`CrewHubClient`): wage-rate matrix, skill levels, phones, emergency contacts; edit rate; internal vs subcontractor.
- [ ] STF-WF-002 `/staff/drivers`: license class, badge expiry, availability; expired licence flagged.
- [ ] STF-WF-003 `/staff/employees`: role assignment, emergency contacts, add/edit.
- [ ] STF-WF-004 `/staff/operators`: **CreateOperatorModal** (wage tier), **EditOperatorModal** (phone, address, certifications); internal vs subcontractor tag.
- [ ] STF-WF-005 `/staff/operators/[id]` (`OperatorProfileClient`): bags poured, satisfaction, weekly earnings, cash turned in.
- [ ] STF-WF-006 `/staff/workers`: helper roster add/edit.
- [ ] STF-WF-007 `/staff/sub-leaders`: add/edit external sub-leader (capacity, rate).

### 5.13 Communication, docs, credentials
- [ ] STF-CM-001 `/staff/directory` chat + phone book: search, tap-to-call links, send/receive.
- [ ] STF-CM-002 `/staff/documents`: upload PDF scans (RC, insurance, PUC, road tax), expiry flag colours (expired / ≤15 d / ok), replace/renew, download.
- [ ] STF-CM-003 `/staff/credentials`: PIN reset for field workers.

### 5.14 Settlements, projects, profile
- [ ] STF-SE-001 `/staff/settlements` (`SettlementDashboard`): gross, helper deductions, fuel deductions, advances, net.
- [ ] STF-SE-002 `StaffLedgerClient` cash reconciliation.
- [ ] STF-PJ-001 `/staff/projects`: add project, bundle dispatches under code, machinery hours + receivables totals.
- [ ] STF-PF-001 `/staff/profile` edit/save.

---

## 6. SUITE 04 — DRIVER MOBILE PWA (Pixel 7 + iPhone)

### 6.1 Shell & nav
- [ ] DRV-NV-001 Bottom nav 5 tabs (My Shift, Dispatches, Log Fuel, Portal, Chat) — each navigates; active pill (cyan) + pulse; touch targets ≥ 48×48 px (assert bounding boxes); safe-area padding.
- [ ] DRV-NV-002 `DriverHeaderProfile` shows name + truck status.
- [ ] DRV-NV-003 `IOSInstallPrompt` on WebKit iPhone: shows "Add to Home Screen" instructions; dismiss persists; not shown on Android.
- [ ] DRV-NV-004 PWA: manifest valid, `/sw.js` registered, app shell loads offline.
- [ ] DRV-NV-005 `IntervalLocationTracker` posts to `/api/location/ping` every ~15 s (use `page.clock`).

### 6.2 Shift (`/driver/home`, `ShiftTracker`, `ShiftSelector`)
- [ ] DRV-SH-001 Vehicle dropdown lists available trucks only (not `IN_USE`/`MAINTENANCE`).
- [ ] DRV-SH-002 Start odometer pre-populated from previous shift; **lower than previous → validation error** (blueprint 5.1).
- [ ] DRV-SH-003 **Start Shift / ഷിഫ്റ്റ് ആരംഭിക്കുക** → `shift_logs` row, vehicle `IN_USE`; button swaps to End form.
- [ ] DRV-SH-004 **End Shift / ഷിഫ്റ്റ് അവസാനിപ്പിക്കുക**: ending odometer < start rejected; valid → total km computed, discrepancy flagged, vehicle freed.
- [ ] DRV-SH-005 Double-tap Start does not create two shifts.
- [ ] DRV-SH-006 Active dispatch card: customer name, **`tel:` link**, address with landmark hint, **Navigate in Google Maps** opens `maps` URL with destination coords (assert URL).
- [ ] DRV-SH-007 No dispatch → empty state.

### 6.3 Autopilot & site pin
- [ ] DRV-AP-001 `SeniorDriverAutopilot`: mock GPS at yard, then move `>250 m` at `≥15 km/h` → status `ACCEPTED→EN_ROUTE` (DB). Slow (<15 km/h) or <250 m → no change.
- [ ] DRV-AP-002 Move within 100 m of site → `EN_ROUTE→IN_PROGRESS`. At 101 m → no change.
- [ ] DRV-AP-003 `DriverSitePinger` button **"സൈറ്റിലേക്ക് ജി.പി.എസ് അയക്കുക"**: accuracy pill (`±6m High Accuracy`) ; saves `DRIVER_PIN` weight 2; degraded accuracy `±85m` warning (scenario 1); GPS denied → graceful error.
- [ ] DRV-AP-004 `SaveLocationButton` secondary confirm when signal weak.

### 6.4 Dispatches & orders
- [ ] DRV-DP-001 `/driver/dispatches`: today + upcoming lists; open card.
- [ ] DRV-DP-002 `/driver/orders/[id]`: status, customer phone, address, notes, machine asset tags, `RouteProgressBar` (Yard→En Route→On Site→Completed).
- [ ] DRV-DP-003 **Accept / acknowledge** assignment → status update.
- [ ] DRV-DP-004 **UploadPhotoButton** ("Upload Drop-off Photo / ഫോട്ടോ അപ്‌ലോഡ് ചെയ്യുക"): `setInputFiles` jpg → `dispatch_photos` row; non-image/oversize rejected.
- [ ] DRV-DP-005 **Call Customer** & **Navigate** buttons.
- [ ] DRV-DP-006 Access another driver's order id → denied.
- [ ] DRV-DP-007 `/driver/map`: current vehicle marker, destination pin, route line.

### 6.5 Fuel `/driver/expenses`
- [ ] DRV-FU-001 History list of past receipts.
- [ ] DRV-FU-002 **FuelLogForm** ("Submit Diesel Log / ഡീസൽ ബില്ല് നൽകുക"): odometer, liters, cost, station (Pala/Erattupetta/Thodupuzha), receipt photo → `fuel_logs`; validation (zero liters, odometer < last).
- [ ] DRV-FU-003 **Anomaly (scenario 5)**: seed pings = 38 km, submit 50 L / ₹5,000 → expense flagged with text `Fuel consumption anomaly detected (0.76 km/L vs expected 4.0 km/L)…`; alert on admin Radar; normal log (e.g., 4 km/L) → not flagged.
- [ ] DRV-FU-004 `ExpenseForm` for toll / puncture repair.

### 6.6 Portal `/driver/portal`
- [ ] DRV-PT-001 `DriverPortalClient` buttons: report breakdown, request flat-tyre mechanic, report traffic delay, **Vehicle Documents** (RC, Insurance, Road Tax, PUC visible — scenario 12).
- [ ] DRV-PT-002 **BreakdownForm** — one test per category: `PUNCTURE / TYRE`, `CLUTCH / GEAR`, `HYDRAULIC FAILURE`, `ENGINE OVERHEATING`, `ACCIDENT`, `POLICE / RTO CHECK` × severity (`VEHICLE IMMOBILIZED`, `CAN DRIVE TO WORKSHOP`); description textarea; GPS auto-attached.
- [ ] DRV-PT-003 **Report Breakdown / തകരാർ റിപ്പോർട്ട് ചെയ്യുക** → `maintenance_tickets` priority HIGH, vehicle `MAINTENANCE`, chat message, SOS on live map (scenario 6).
- [ ] DRV-PT-004 **Report MVD Check** → 20-min administrative delay on dispatch; stationary radar suppressed (scenario 12).

### 6.7 Cash & pool
- [ ] DRV-CS-001 `/driver/cash` **Record Freight Cash / കൂലിപ്പണം വാങ്ങുക** with customer signature → `cash_collections`; amount validation.
- [ ] DRV-PL-001 `/driver/pool` lists open runs; **Claim Overtime Haul / ട്രിപ്പ് ഏറ്റെടുക്കുക** → `daily_dispatches.driverId`; second driver claiming same job gets "already claimed" (race test with 2 contexts).

### 6.8 Chat, pay, profile
- [ ] DRV-CH-001 Send/receive with dispatcher (cross-context with staff).
- [ ] DRV-PY-001 `/driver/pay`: trips, km, allowances, advance deductions, net — equals settlement seed.
- [ ] DRV-PF-001 `/driver/profile`: licence class, phone, emergency contacts; `MyProfileModal` edit.

### 6.9 Keypad-phone driver (scenario 2)
- [ ] DRV-KP-001 `driver2` never logs in; staff pins site on his behalf; verify dispatch coordinates & audit log (cross with STF-DS-008).

---

## 7. SUITE 05 — OPERATOR MOBILE PWA

### 7.1 Layout, header, offline banner
- [ ] OPR-LY-001 Header: logo, role tag (`OPERATOR` / `CONTRACTOR`), network dot (green online / red offline), sign-out.
- [ ] OPR-LY-002 Go offline → banner `⚠️ OFFLINE MODE — Data will save automatically when signal returns.` appears; online → disappears.
- [ ] OPR-LY-003 Bottom nav 3 tabs (My Job, Chat, Pay/Invoice) navigate; `template.tsx` transitions don't break clicks; `loading.tsx` skeleton.
- [ ] OPR-LY-004 `IntervalLocationTracker` 60 s pings + `AutoPinger`.
- [ ] OPR-LY-005 Service Worker registered; session cached.

### 7.2 Pre-start checklist (`PreStartChecklist`)
- [ ] OPR-PS-001 4 Yes/No toggles: Mobil oil, hoist wire rope, drum teeth & clutch, safety guards.
- [ ] OPR-PS-002 Pour/docket controls **locked** until checklist submitted.
- [ ] OPR-PS-003 **Sign Safety Check / സുരക്ഷാ പരിശോധന പൂർത്തിയാക്കുക** → `equipment_verification_logs` (all four booleans stored) → controls unlock.
- [ ] OPR-PS-004 A "No" answer: behaviour per rules (warning / blocked / flagged) — document.
- [ ] OPR-PS-005 Cannot submit twice; admin Radar clears "missing checklist".

### 7.3 Crew & labor
- [ ] OPR-CR-001 `CrewAllocation`: attendance checkboxes, trolly workers (1-wheel / 2-wheel counts), sub-leader tag; **Save Attendance / ഹാജർ രേഖപ്പെടുത്തുക** → `attendance_logs`.
- [ ] OPR-CR-002 Negative counts rejected.
- [ ] OPR-CR-003 `LogExternalLaborForm` **Add Local Helper / പുറത്തുനിന്നുള്ള സഹായി**: name, wage ₹, paid-from-cash toggle → `external_labor_logs`; validation.

### 7.4 Docket (`DocketCanvas`) — most critical
- [ ] OPR-DK-001 Bag counter buttons `+10`, `+25`, `+50`, `-1`: totals correct; cannot go below 0.
- [ ] OPR-DK-002 Floor radios `Ground / 1st / 2nd / 3rd+` apply lift surcharge from `WorkTypeRate`.
- [ ] OPR-DK-003 Overtime toggle `Normal` vs `Late Night`.
- [ ] OPR-DK-004 **Live Hire Amount** equals expected formula for ≥6 combos (table-driven: bags × rate + lift + overtime).
- [ ] OPR-DK-005 **Idle Waiting Time** `+30 / +60 mins` → line item `Machine Idle Waiting Time: 3.0 Hours @ ₹450/hr = ₹1,350` (scenario 8).
- [ ] OPR-DK-006 Signature pad: empty signature → finalize blocked; draw stroke → enabled; **Clear** resets.
- [ ] OPR-DK-007 **Lock & Finalize Docket / ഡോക്കറ്റ് പൂർത്തിയാക്കുക** → `field_diary_logs` (Base64 PNG), dispatch `DELIVERED`, **draft invoice created**; docket becomes read-only; timestamps for each bag increment stored (scenario 9).
- [ ] OPR-DK-008 Double-submit protection.
- [ ] OPR-DK-009 `IdleDelayButton` **Rain Delay / മഴ തടസ്സം** → `delayReason=HEAVY_RAIN`, billing/stationary alerts paused; rain-delay hours appear on signed docket (scenario 7).

### 7.5 Site pin
- [ ] OPR-SP-001 `UpdateSiteLocationButton` **at site (≤100 m)** → `OPERATOR_PIN` weight 3 candidate saved.
- [ ] OPR-SP-002 **From home (11 km)** → rejected with exact message "Your current GPS location is more than 100m away from the pinned site. Please ping your live location on site."; dispatch coords unchanged; status `PENDING` (scenario 4). Boundary: 99 m OK, 101 m rejected.
- [ ] OPR-SP-003 10-min dwell → `SiteDwellCluster` created, location upgraded `VERIFIED_CENTROID` weight 4 (scenario 1; simulate with ≥10 min of pings via `page.clock`).

### 7.6 Other screens
- [ ] OPR-FD-001 `/operator/field-diary/[dispatchId]` past docket: signature, bags, surcharges, timestamps.
- [ ] OPR-EQ-001 `/operator/equipment` health/checklist history.
- [ ] OPR-SC-001 `/operator/scanner`: fake camera (`--use-fake-device-for-media-stream`), valid QR asset tag verified; invalid QR error; camera denied → fallback message.
- [ ] OPR-PY-001 `/operator/pay` weekly wage summary.
- [ ] OPR-LG-001 `/operator/ledger`: completed dockets, bag bonus, floor-lift bonus, helper allowances, advance deductions, Saturday net (compare with settlement seed).
- [ ] OPR-LG-002 **Request Advance / അഡ്വാൻസ് ചോദിക്കുക** (`RequestAdvanceButton`) → `salary_advances` `PENDING`; appears in admin Advances; invalid amount rejected.
- [ ] OPR-CH-001 Chat with dispatcher & driver (cross-context).
- [ ] OPR-PF-001 Profile + emergency contacts; `MyProfileModal`.
- [ ] OPR-CT-001 CONTRACTOR variant: role tag, restricted pages, external labor flow.

---

## 8. SUITE 06 — CROSS-ROLE END-TO-END JOURNEYS (multi-context)

Use **one browser, 5 contexts** (staff, driver, operator, admin, owner). Each journey asserts UI **and** DB at every handoff.

- [ ] JRN-001 **Golden path (full day)**
  1. Staff books order (OrderIntakeForm) → `PENDING`.
  2. Staff crew-builds: driver1 + operator1 + helpers + truck + mixer + tools checkout.
  3. Driver sees it, starts shift (odometer), accepts → `ACCEPTED`.
  4. Driver GPS leaves yard → autopilot `EN_ROUTE`; staff live map shows moving truck; dashboard counters update.
  5. Driver arrives <100 m → `IN_PROGRESS`; pins ground location.
  6. Operator pre-start checklist → crew attendance → external labor → pins site → bag counter → floor/overtime → customer signature → finalize → `DELIVERED` + draft invoice.
  7. Staff verifies bag count in field diary, converts to final invoice (billing client) → admin sees invoice in Billing.
  8. Customer pays: operator/driver cash collection → staff verifies → confirms bank deposit → admin Revenue Hero updates.
  9. Tools returned at gate (ToolReturnModal).
  10. Driver ends shift (km computed).
  11. Saturday settlement: admin/staff settlement shows gross − advances − fuel ± adjustments; owner authorizes; NEFT file generated.
  12. Owner Ledger totals include it.
- [ ] JRN-002 **Advance lifecycle**: operator requests → admin approves → deduction appears in operator ledger + settlement.
- [ ] JRN-003 **PIN reset lifecycle**: worker taps Forgot PIN → admin badge lights → admin generates PIN → worker logs in with new PIN → badge clears.
- [ ] JRN-004 **Dispute lifecycle** (scenario 9): operator docket 115 bags, customer disputes 80 → staff opens field diary → timestamps + signature → staff override modal (reason) → audit log.
- [ ] JRN-005 **Breakdown lifecycle** (scenario 6): driver SOS → ticket HIGH → chat → live map flashing → staff assigns mechanic + dispatches 2nd truck → resolved.
- [ ] JRN-006 **Job pool race**: two drivers claim same job simultaneously → exactly one wins.
- [ ] JRN-007 **Soft delete → trash → restore → purge** across admin/owner.
- [ ] JRN-008 **Rate change propagation**: admin changes rate → new booking quote and operator docket use new rate; old invoices unchanged.
- [ ] JRN-009 **Impersonation**: admin impersonates driver → views shift → tries cash collection (blocked) → exits → audit log.
- [ ] JRN-010 **Credit limit**: customer over limit books → warning → admin audits receivables.
- [ ] JRN-011 **Multi-machine commercial pour**: 2 mixers + hoist + 3 vibrators; each machine operator completes own docket; one combined project receivable.
- [ ] JRN-012 **Compliance radar loop**: create each anomaly → admin sees → flags for audit → resolves root cause → radar clears.

---

## 9. SUITE 07 — 12 FIELD SCENARIOS (blueprint §10) — one spec file each

| ID | Scenario | Must prove |
|---|---|---|
| SCN-01 | Rubber estate canopy (±85 m accuracy) | ping stored `quality:"DEGRADED"`; Driver pin weight 2; dwell >10 min → `VERIFIED_CENTROID` weight 4 |
| SCN-02 | Keypad-phone driver | staff `STAFF_OVERRIDE` weight 5; mandatory reason; audit `LOCATION_UPDATE_ON_BEHALF` w/ staff employee ID |
| SCN-03 | Teekoy cellular blackout | offline banner; checklist + attendance + docket (90 bags + signature) queue to `offline_dockets_queue`; pings to `offline_location_pings_queue`; on `online` event all flush; dispatch `DELIVERED`; no duplicates |
| SCN-04 | Operator-at-home fraud | proximity guard rejects (11 km); coords unchanged |
| SCN-05 | Diesel siphoning | 0.76 km/L flagged, Radar alert, non-accusatory wording |
| SCN-06 | Ghat breakdown | `HYDRAULIC FAILURE` + `IMMOBILIZED`, coords `9.6920, 76.8110`, ticket HIGH, vehicle `MAINTENANCE`, chat alert, red SOS marker |
| SCN-07 | Monsoon & drum wash | rain delay → `HEAVY_RAIN`, billing paused, external labor waiting hours, signature confirms |
| SCN-08 | Aggregate shortage | idle counter, `waitingHourlyRate` ₹450 × 3 h = ₹1,350 line item on docket/invoice |
| SCN-09 | Disputed cement bags | 5 timestamped increments (25,25,25,25,15) + signature visible to staff |
| SCN-10 | Missing vibrator needle | 40 mm `RETURNED`, 60 mm `MISSING` + note → recovery ticket, liability on customer account, auto collection stop next morning |
| SCN-11 | Helper count mismatch | review modal: 4 verified vs 6 claimed; admin rejects; ₹1,800 not paid; audit log |
| SCN-12 | MVD inspection | driver "Vehicle Documents" shows RC/Insurance/Road Tax/PUC; "Report MVD Check" logs 20-min delay & suppresses stationary alert |

---

## 10. SUITE 08 — OFFLINE / PWA / GPS

- [ ] PWA-001 `/sw.js` installs; app shell cached; reload offline loads operator & driver shells.
- [ ] PWA-002 Offline: every operator form (checklist, attendance, external labor, docket) saves to IndexedDB, shows "saved offline" feedback, no error toast.
- [ ] PWA-003 `offline_location_pings_queue` capped at **200**; 201st drops oldest (or per rule — document).
- [ ] PWA-004 Reconnect → atomic batch flush to `/api/location/ping` and `submitFieldDiaryAction`; **idempotent** (re-firing `online` does not duplicate).
- [ ] PWA-005 Flaky network (offline/online toggling mid-submit) — no data loss.
- [ ] PWA-006 Session survives offline reload (cached session).
- [ ] PWA-007 Offline navigation between all 3 operator tabs and 5 driver tabs works from cache.
- [ ] PWA-008 `/api/location/ping`: valid ping 200; missing fields 400; unauthenticated 401; out-of-range coords rejected; accuracy > threshold → `DEGRADED`.
- [ ] PWA-009 Geolocation permission denied → clear UI message, app still usable.

---

## 11. SUITE 09 — SECURITY, NEGATIVE & VALIDATION

- [ ] SEC-001 **PIN flow**: wrong PIN ×N → lockout/rate-limit behaviour documented; reset request does not reveal whether number exists.
- [ ] SEC-002 **Forgot PIN request** appears in admin & staff credentials hubs; duplicate requests deduped.
- [ ] SEC-003 IDOR: driver/operator guessing other ids (`/driver/orders/<other>`, `/operator/field-diary/<other>`, `/staff/invoices/<customer>` as driver) → denied.
- [ ] SEC-004 Server actions called by wrong role (replay via `request`) → rejected (cash verify as driver, rates edit as staff, trash purge as staff).
- [ ] SEC-005 XSS payloads in chat, customer name, notes, tool name, expense vendor → rendered inert.
- [ ] SEC-006 SQL-ish / unicode / Malayalam / emoji / 10k-char inputs on every text field family.
- [ ] SEC-007 File uploads: wrong mime, 0-byte, >limit, double extension (`a.jpg.exe`).
- [ ] SEC-008 CSRF/origin: server actions rejected from foreign origin (if applicable).
- [ ] SEC-009 Impersonation cannot be started by STAFF; cannot nest; exit always available.
- [ ] SEC-010 Financial mutations locked while impersonating (covers every §9 financial button).
- [ ] SEC-011 Decimal sanitization: load every page with extreme decimals (₹0.00, ₹99,99,999.99, lat/lon 6 decimals) → no serialization panic.
- [ ] SEC-012 Concurrency: two staff edit same dispatch; two cashiers verify same envelope → no double deposit.
- [ ] SEC-013 Back-button after logout cannot show cached private data.
- [ ] SEC-014 Rate-limits / large pagination don't crash.

### Form validation sweep (generic helper `fillInvalid(form)`)
Run for **every form**: required empty, whitespace-only, negative amounts, zero, decimals, very large number, wrong phone length (≠10), invalid GSTIN, future/past date rules, duplicate unique keys, Esc/Cancel discards, double-click submit, server error toast on forced 500 (route fulfil 500).

---

## 12. SUITE 10 — NON-FUNCTIONAL

- [ ] NFR-001 **Responsive**: every Admin/Staff page at 1440, 1024, 768, 375 → no horizontal body scroll, sidebar→drawer, tables scroll inside container.
- [ ] NFR-002 **Mobile ergonomics**: driver & operator pages at 360×640: no overlap with bottom nav, tap targets ≥ 48 px, safe-area.
- [ ] NFR-003 **Accessibility** (`@axe-core/playwright`): zero *serious/critical* violations per page; keyboard-only run of sidebar, modals (focus trap, Esc, focus return), forms; labels for all inputs; contrast of operator login keypad.
- [ ] NFR-004 **i18n**: Malayalam labels render (no tofu boxes/mojibake) on all buttons in §9 catalog.
- [ ] NFR-005 **Visual regression**: screenshots of dashboards, invoice print page, docket, live map shell (mask maps/time/charts).
- [ ] NFR-006 **Performance**: key pages LCP budget on throttled 4G (<4 s) ; no request waterfall >N; map tile requests mocked.
- [ ] NFR-007 **Loading & error states**: every `loading.tsx` skeleton; `error.tsx` boundary (fleet) and not-found for invalid dynamic ids on **all** `[id]` routes.
- [ ] NFR-008 **Print CSS** for invoices (`@media print`).
- [ ] NFR-009 **Timezone**: Asia/Kolkata date boundaries (11:30 PM pour counts to right day; Saturday settlement cut-off).
- [ ] NFR-010 **Currency formatting** ₹ with Indian grouping (`1,00,000`).

---

## 13. MASTER BUTTON COVERAGE CHECKLIST (blueprint §9) — every row needs a passing test

| Role | Page | Button (English / Malayalam) | Server action | Assert |
|---|---|---|---|---|
| Admin | dashboard | Review Anomaly / പരിശോധിക്കുക | `flagDispatchForReviewAction` | `isFlagged=true`, audit |
| Admin | dashboard | Dismiss Alert / ഒഴിവാക്കുക | client | hidden 4 h |
| Admin | advances | Issue Cash Advance / അഡ്വാൻസ് നൽകുക | `createSalaryAdvanceAction` | `salary_advances` |
| Admin | adjustments | Apply Adjustment / അഡ്ജസ്റ്റ്മെന്റ് ചേർക്കുക | `createManualAdjustmentAction` | `manual_adjustments` |
| Admin | adjustments | Reverse Adjustment / അസാധുവാക്കുക | `reverseManualAdjustmentAction` | `REVERSED` |
| Admin | credentials | Generate Temporary PIN / പുതിയ പിൻ നൽകുക | `adminResetPasswordAction` | hash changed, audit |
| Admin | billing | Generate Tax Invoice / ടാക്സ് ഇൻവോയ്സ് തയ്യാറാക്കുക | `createInvoiceFromDispatch` | invoice + items |
| Admin | trash | Restore Dispatch / വീണ്ടെടുക്കുക | `restoreDispatchAction` | `isPendingDelete=false` |
| Admin | trash | Permanent Purge / പൂർണ്ണമായി നീക്കം ചെയ്യുക | `purgeDispatchAction` | cascade |
| Staff | orders | Book Dispatch / ഓർഡർ സ്ഥിരീകരിക്കുക | `createDailyDispatchAction` | dispatch + machines |
| Staff | dispatch | Advance Status / സ്റ്റാറ്റസ് മാറ്റുക | `updateDispatchStatusAction` | status |
| Staff | dispatch | Save Ground Location / ലൊക്കേഷൻ രേഖപ്പെടുത്തുക | `setDispatchLocationWithPriority` | `STAFF_OVERRIDE` w5 |
| Staff | tools | Register Tool / ഉപകരണം ചേർക്കുക | `createToolAction` | `tools` |
| Staff | tools | Check-in Tool / തിരികെ വാങ്ങുക | `processToolReturnAction` | `RETURNED` |
| Staff | cash | Verify Physical Cash / പണം ഉറപ്പാക്കുക | `verifyCashCollectionAction` | `VERIFIED` |
| Staff | cash | Confirm Bank Deposit / ബാങ്ക് ഡെപ്പോസിറ്റ് സ്ഥിരീകരിക്കുക | `confirmCashDepositAction` | `DEPOSITED` |
| Staff | fleet | Add Concrete Mixer / മെഷീൻ ചേർക്കുക | `createMachine` | `machines` |
| Staff | fleet | Add Carrier Truck / വാഹനം ചേർക്കുക | `createVehicle` | `vehicles` |
| Staff | maintenance | Open Repair Ticket / വർക്ക്ഷോപ്പ് ടിക്കറ്റ് എടുക്കുക | `createMaintenanceTicketAction` | `maintenance_tickets` |
| Driver | home | Start Shift / ഷിഫ്റ്റ് ആരംഭിക്കുക | `startShiftAction` | `shift_logs`, `IN_USE` |
| Driver | home | End Shift / ഷിഫ്റ്റ് അവസാനിപ്പിക്കുക | `endShiftAction` | endTime, km |
| Driver | order | Pin Ground Location / സൈറ്റിലേക്ക് ജി.പി.എസ് അയക്കുക | `setDispatchLocationWithPriority` | `DRIVER_PIN` w2 |
| Driver | order | Upload Drop-off Photo / ഫോട്ടോ അപ്‌ലോഡ് ചെയ്യുക | `uploadDispatchPhotoAction` | `dispatch_photos` |
| Driver | expenses | Submit Diesel Log / ഡീസൽ ബില്ല് നൽകുക | `createFuelLogAction` | `fuel_logs` + audit |
| Driver | portal | Report Breakdown / തകരാർ റിപ്പോർട്ട് ചെയ്യുക | `createMaintenanceTicketAction` | ticket HIGH |
| Driver | cash | Record Freight Cash / കൂലിപ്പണം വാങ്ങുക | `recordDriverCashAction` | `cash_collections` |
| Driver | pool | Claim Overtime Haul / ട്രിപ്പ് ഏറ്റെടുക്കുക | `claimPoolJobAction` | `driverId` |
| Operator | home | Sign Safety Check / സുരക്ഷാ പരിശോധന പൂർത്തിയാക്കുക | `submitEquipmentVerificationAction` | verification log |
| Operator | home | Save Attendance / ഹാജർ രേഖപ്പെടുത്തുക | `saveCrewAttendanceAction` | `attendance_logs` |
| Operator | home | Add Local Helper / പുറത്തുനിന്നുള്ള സഹായി | `logExternalLaborAction` | `external_labor_logs` |
| Operator | home | Lock & Finalize Docket / ഡോക്കറ്റ് പൂർത്തിയാക്കുക | `submitFieldDiaryAction` | diary, `DELIVERED`, draft invoice |
| Operator | home | Update Site Location / സൈറ്റ് ലൊക്കേഷൻ പിൻ ചെയ്യുക | `setDispatchLocationWithPriority` | `OPERATOR_PIN` w3 + 100 m guard |
| Operator | pay | Request Advance / അഡ്വാൻസ് ചോദിക്കുക | `requestSalaryAdvanceAction` | `PENDING` |
| Shared | components | Collect Payment / പേയ്‌മെന്റ് സ്വീകരിക്കുക | `recordCashCollectionAction` | cash + payment record |
| Shared | components | Rain Delay / മഴ തടസ്സം | `recordDispatchDelayAction` | `HEAVY_RAIN` |

For each: **happy path, validation failure, cancel, double-click, wrong-role denied.**

---

## 14. PAGE INVENTORY (every route must have ≥ 1 load test + role-allowed + role-denied test)

**Public:** `/`, `/operator/login` (+ login for other roles — confirm URL)

**Admin/Owner:** `/admin` · `/admin/dashboard` · `/admin/chat` · `/admin/credentials` · `/admin/adjustments` · `/admin/advances` · `/admin/allocation` · `/admin/analytics` · `/admin/billing` · `/admin/billing/print/[invoiceId]` · `/admin/billing/receivables` · `/admin/dispatch-board` · `/admin/documents` (actions) · `/admin/live` · `/admin/live/map` · `/admin/profile` · `/admin/settings/rates` · `/admin/settings/website` · `/admin/settlements` · `/admin/staff` · `/admin/trash` · `/owner/dashboard` · `/owner/allocation` · `/owner/billing` · `/owner/ledger` · `/owner/settlements` · `/owner/employees` · `/owner/staff-log` · `/owner/trash`

**Staff:** `/staff/dashboard` · `/staff/orders` · `/staff/dispatch` · `/staff/dispatch/new` · `/staff/billing/[dispatchId]` · `/staff/invoices` · `/staff/invoices/[customerId]` · `/staff/cash` · `/staff/expenses` · `/staff/expenses/new` · `/staff/fleet` · `/staff/fleet/machine/[id]` · `/staff/fleet/vehicle/[id]` · `/staff/live` · `/staff/live/map` · `/staff/tools` · `/staff/maintenance` · `/staff/crew` · `/staff/drivers` · `/staff/employees` · `/staff/operators` · `/staff/operators/[id]` · `/staff/workers` · `/staff/sub-leaders` · `/staff/directory` · `/staff/documents` · `/staff/credentials` · `/staff/settlements` · `/staff/reconciliation` · `/staff/projects` · `/staff/field-diary/[dispatchId]` · `/staff/profile`

**Driver:** `/driver/home` · `/driver/dispatches` · `/driver/orders/[id]` · `/driver/map` · `/driver/expenses` · `/driver/portal` · `/driver/cash` · `/driver/pool` · `/driver/chat` · `/driver/pay` · `/driver/profile`

**Operator:** `/operator/login` · `/operator/home` · `/operator/field-diary/[dispatchId]` · `/operator/equipment` · `/operator/scanner` · `/operator/pay` · `/operator/ledger` · `/operator/chat` · `/operator/profile`

**API/infra:** `/api/location/ping` · `/sw.js`

---

## 15. EXECUTION, TAGS & CI

- Tags: `@smoke` (≈25 tests, <5 min), `@rbac`, `@admin`, `@owner`, `@staff`, `@driver`, `@operator`, `@journey`, `@scenario`, `@offline`, `@security`, `@a11y`, `@visual`, `@slow`.
- Commands (add to `package.json`): `e2e`, `e2e:smoke`, `e2e:admin`, `e2e:staff`, `e2e:driver`, `e2e:operator`, `e2e:journeys`, `e2e:headed`, `e2e:report`.
- CI: GitHub Actions; Postgres service; `prisma migrate deploy` + `e2e-seed`; build app, run `next start`; shard ×4; upload HTML report + traces; fail PR on any `@smoke`/`@rbac` failure.
- Flake policy: any test that fails once in 20 repeat-runs (`--repeat-each=20`) must be fixed, not retried.
- Mock external services: map tiles, OSRM routing, WhatsApp/`wa.me`, Google Maps deep links, camera, geolocation.

---

## 16. DEFINITION OF DONE

1. Every `- [ ]` in this file is implemented or listed in `docs/COVERAGE_REPORT.md` as BLOCKED with a reason.
2. All 5 portals + public site: **every route** in §14 has load / allow / deny tests.
3. All 36 rows of §13 have happy + failure + wrong-role tests.
4. All 12 journeys (§8) and 12 scenarios (§9) pass 3× consecutively.
5. Zero uncaught page errors / console errors / 5xx across the entire run.
6. `docs/testid-additions.md` lists every added `data-testid`.
7. Final summary message lists: total tests, pass/fail, flaky, blocked, and any **real bugs found** (with repro steps) — do **not** silently change tests to hide app bugs.

### Start now
1. Read the repo (`src/app`, `src/components`, `prisma/schema.prisma`, auth config).
2. Ask the human the **open questions** in §1.3 (login URLs, seed/reset strategy) — then proceed.
3. Implement §1 (setup + fixtures), then Suite 01, and report before continuing.
