# Zero Group ERP (IronRent) - Simulation Blueprint

## 1. Roles & Portal Access
* **Admin (OWNER):** Full access to `/admin/*` (Dashboard, Fleet, Employees, Dispatch, Cash, Settlements, etc.).
* **Staff (STAFF):** Access to `/staff/*` (Dashboard, Fleet, Dispatch, Cash, Expenses, Orders). Restricted from finalized settlements.
* **Driver (DRIVER):** Access to `/driver/*` (Home, Dispatches, Cash, Pay, Chat). Shift logging and delivery checks.
* **Operator (OPERATOR):** Access to `/operator/*` (Home, Equipment, Scanner, Pay). Actioning dockets and tracking metrics (fuel, standby, etc.).

---

## 2. Page-by-Page Simulation Scenarios

### Admin Portal (`/admin/*`)
- **`/admin/dashboard`**: Validate aggregate metrics and active dispatch counts.
- **`/admin/dispatch`**: Simulate creating a new Daily Dispatch.
  - *Scenario:* Create a dispatch for a Mixer + Lift with Driver and Operator assigned.
  - *Expected State:* Dispatch is `PENDING`. Visible to Driver and Operator.
- **`/admin/cash` & `/admin/expenses`**: Validate manual tracking, filtering by employee, and creation of `ManualAdjustment` (Bonuses/Penalties).
- **`/admin/settlements`**: Process payroll based on Operator/Driver logs.
  - *Scenario:* Finalize a week's settlement. Validate OCC version lock.

### Staff Portal (`/staff/*`)
- **`/staff/dispatch`**: Simulate the 2:00 PM cutoff rule for dispatch cancellation.
  - *Scenario:* Postpone a dispatch before 2:00 PM next day. Ensure StatusHistory captures the mandatory reason.

### Driver PWA (`/driver/*`)
- **`/driver/home`**: Log shift start.
- **`/driver/dispatches`**: Accept a dispatch, start trip, and mark as delivered.
  - *Scenario:* Driver clicks "En Route" -> "Delivered". GPS location mapping to DB `latitude`/`longitude`.
- **`/driver/cash` & `/driver/expenses`**: Log on-road expenses (e.g., Tolls/Fuel).

### Operator PWA (`/operator/*`)
- **`/operator/home`**: View assigned jobs. Start Job -> Complete Job.
  - *Scenario:* Operator submits a Docket. Enters meter readings, washout minutes, and captures the client's signature (SVG string).
- **`/operator/equipment`**: Submit a Fluid Log (Expense type DIESEL) or Maintenance Ticket.
  - *Scenario:* Report breakdown. Ensures Priority is set, photo URL attached, and RabbitMQ TODO triggered.

---

## 3. The Circular Workflow

1. **Creation (Admin/Staff):** A new `DailyDispatch` is created linking `CustomerId`, `MachineId`, `DriverId`, and `OperatorId`.
2. **Transportation (Driver):** The Driver logs in, starts their shift, sees the dispatch, accepts it, and updates status to `DELIVERED`.
3. **Execution (Operator):** The Operator sees the machine is on-site. The Operator updates status to `IN_PROGRESS`, performs the job, and completes the `OperatorDocket` (metrics, signature).
4. **Resolution (Admin/Staff):** The job moves to `COMPLETED`. Admin reviews the docket, finalizes the scope (`isScopeFinalized = true`), and the financial values lock into the `Settlement` engine. Admin eventually finalizes the `Settlement`.

---

## 4. Edge Cases & Resilience Testing

- **Optimistic Concurrency Control (OCC):**
  - *Scenario:* Simulate two Admins attempting to finalize the same dispatch simultaneously.
  - *Expected:* The second attempt fails due to version mismatch.
- **Offline IndexedDB Queue:**
  - *Scenario:* Simulate network disconnect on Driver PWA. Driver marks job as delivered. Network reconnects.
  - *Expected:* IndexedDB queues the mutation and syncs (`lastSyncStatus` updates) when online.
- **Supabase Media Uploads:**
  - *Scenario:* Operator captures a meter reading photo.
  - *Expected:* UI uploads Base64 to Next.js API, forwards to Supabase, and stores the secure URL in the DB without exposing credentials to the client.
