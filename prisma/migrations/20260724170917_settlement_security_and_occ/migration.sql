-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'STAFF', 'DRIVER', 'OPERATOR', 'WORKER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'CASH', 'CHEQUE', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "VibratorType" AS ENUM ('PETROL', 'ELECTRIC');

-- CreateEnum
CREATE TYPE "MixerCategory" AS ENUM ('STANDARD', 'HYDRAULIC');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MachineType" AS ENUM ('MIXER', 'LIFT', 'VIBRATOR', 'PANI', 'INDEPENDENT');

-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('AVAILABLE', 'RENTED', 'REPAIR');

-- CreateEnum
CREATE TYPE "ToolStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'REPAIR');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'REPAIR');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('NORMAL', 'TROLLY', 'LATE');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('PENDING', 'DELIVERED', 'PICKED_UP', 'COMPLETED', 'CANCELLED', 'POSTPONED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('DIESEL', 'REPAIR', 'TRAVEL', 'OTHER');

-- CreateEnum
CREATE TYPE "AdvanceStatus" AS ENUM ('PENDING', 'SETTLED');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('BONUS', 'PENALTY');

-- CreateEnum
CREATE TYPE "AdjustmentStatus" AS ENUM ('PENDING', 'SETTLED');

-- CreateEnum
CREATE TYPE "ManualAdjustmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateEnum
CREATE TYPE "CashDepositStatus" AS ENUM ('PENDING_DEPOSIT', 'DEPOSITED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DRIVER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "siteLocation" TEXT,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "advanceDeducted" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paidCash" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paidUpi" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paidBank" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "paymentMethod" "PaymentMethod",
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "itemKey" TEXT NOT NULL,
    "malayalamName" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "rate" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machines" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "type" "MachineType" NOT NULL,
    "status" "MachineStatus" NOT NULL DEFAULT 'AVAILABLE',
    "operatorDailyPayout" DECIMAL(10,2) NOT NULL,
    "fuelConsumptionThreshold" DECIMAL(10,2) NOT NULL DEFAULT 2000,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tools" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "toolType" TEXT,
    "totalInventory" INTEGER NOT NULL DEFAULT 10,
    "status" "ToolStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "fixedSalary" DECIMAL(10,2),
    "userId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT DEFAULT 'ONLINE',
    "offlineQueueCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_type_rates" (
    "id" TEXT NOT NULL,
    "machineType" "MachineType" NOT NULL,
    "workType" "WorkType" NOT NULL,
    "payoutRate" DECIMAL(10,2) NOT NULL,
    "customerCharge" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_type_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_dispatches" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "machineId" TEXT,
    "driverId" TEXT,
    "operatorId" TEXT,
    "workerId" TEXT,
    "mainHelperId" TEXT,
    "location" TEXT NOT NULL,
    "mapLink" TEXT,
    "dateOfService" DATE NOT NULL,
    "workType" "WorkType" NOT NULL DEFAULT 'NORMAL',
    "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING',
    "operatorDailyRate" DECIMAL(10,2),
    "customerCharge" DECIMAL(10,2),
    "notes" TEXT,
    "liftFloors" INTEGER DEFAULT 1,
    "mixerCategory" "MixerCategory" DEFAULT 'STANDARD',
    "vibratorType" "VibratorType",
    "hasTrollyBench" BOOLEAN NOT NULL DEFAULT false,
    "cementBags" INTEGER DEFAULT 0,
    "mainHelperName" TEXT,
    "helperCount" INTEGER NOT NULL DEFAULT 0,
    "trollyWorkerCount" INTEGER NOT NULL DEFAULT 0,
    "customOperatorWage" DECIMAL(10,2),
    "actualWagePaid" DECIMAL(10,2) DEFAULT 0,
    "machineNumberTag" TEXT,
    "publicTransportUsed" BOOLEAN NOT NULL DEFAULT false,
    "conflictReport" TEXT,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "siteBundleId" TEXT,
    "isScopeFinalized" BOOLEAN NOT NULL DEFAULT false,
    "closingWorkNotes" TEXT,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_machines" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,

    CONSTRAINT "dispatch_machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_assets" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,

    CONSTRAINT "dispatch_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_tools" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "variant" TEXT,

    CONSTRAINT "dispatch_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_labor_crews" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "internalEmployeeId" TEXT,
    "externalWorkerName" TEXT,
    "headCount" INTEGER NOT NULL DEFAULT 1,
    "helperCount" INTEGER NOT NULL DEFAULT 0,
    "lumpSumWage" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "actualWagePaid" DECIMAL(10,2) DEFAULT 0,
    "internalHeadCount" INTEGER NOT NULL DEFAULT 0,
    "externalHeadCount" INTEGER NOT NULL DEFAULT 0,
    "outsideWagePaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isExternalLiability" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatch_labor_crews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_operators_v11" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "internalEmployeeId" TEXT,
    "externalName" TEXT,
    "dayWage" DECIMAL(10,2),
    "actualWagePaid" DECIMAL(10,2) DEFAULT 0,

    CONSTRAINT "dispatch_operators_v11_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_workers" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "dispatch_workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_status_history" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "oldStatus" "DispatchStatus" NOT NULL,
    "newStatus" "DispatchStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_logs" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "loggerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "vehicleId" TEXT,
    "machineId" TEXT,
    "notes" TEXT,
    "isAlertTriggered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_collections" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "amountCollected" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "status" "CashDepositStatus" NOT NULL DEFAULT 'PENDING_DEPOSIT',
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_advances" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "status" "AdvanceStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_adjustments" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "AdjustmentType" NOT NULL,
    "reason" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "settlementStatus" "AdjustmentStatus" NOT NULL DEFAULT 'PENDING',
    "status" "ManualAdjustmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settlements" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "weekEnding" DATE NOT NULL,
    "totalLaborEarned" DECIMAL(12,2) NOT NULL,
    "totalCashHeld" DECIMAL(12,2) NOT NULL,
    "totalAdvances" DECIMAL(12,2) NOT NULL,
    "totalAdjustments" DECIMAL(12,2) NOT NULL,
    "finalPayout" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "finalizedById" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "delta" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_billNumber_key" ON "invoices"("billNumber");

-- CreateIndex
CREATE INDEX "invoices_customerId_idx" ON "invoices"("customerId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_date_idx" ON "invoices"("date");

-- CreateIndex
CREATE INDEX "invoices_billNumber_idx" ON "invoices"("billNumber");

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "invoice_items"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "machines_machineId_key" ON "machines"("machineId");

-- CreateIndex
CREATE INDEX "machines_status_idx" ON "machines"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tools_toolId_key" ON "tools"("toolId");

-- CreateIndex
CREATE INDEX "tools_status_idx" ON "tools"("status");

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "employees"("userId");

-- CreateIndex
CREATE INDEX "employees_role_idx" ON "employees"("role");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_licensePlate_key" ON "vehicles"("licensePlate");

-- CreateIndex
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "work_type_rates_machineType_workType_key" ON "work_type_rates"("machineType", "workType");

-- CreateIndex
CREATE INDEX "daily_dispatches_status_idx" ON "daily_dispatches"("status");

-- CreateIndex
CREATE INDEX "daily_dispatches_operatorId_idx" ON "daily_dispatches"("operatorId");

-- CreateIndex
CREATE INDEX "daily_dispatches_driverId_idx" ON "daily_dispatches"("driverId");

-- CreateIndex
CREATE INDEX "daily_dispatches_dateOfService_idx" ON "daily_dispatches"("dateOfService");

-- CreateIndex
CREATE INDEX "daily_dispatches_invoiceId_idx" ON "daily_dispatches"("invoiceId");

-- CreateIndex
CREATE INDEX "daily_dispatches_siteBundleId_idx" ON "daily_dispatches"("siteBundleId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_dispatches_dateOfService_customerId_siteBundleId_key" ON "daily_dispatches"("dateOfService", "customerId", "siteBundleId");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_machines_dispatchId_machineId_key" ON "dispatch_machines"("dispatchId", "machineId");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_assets_dispatchId_machineId_key" ON "dispatch_assets"("dispatchId", "machineId");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_tools_dispatchId_toolId_variant_key" ON "dispatch_tools"("dispatchId", "toolId", "variant");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_workers_dispatchId_employeeId_key" ON "dispatch_workers"("dispatchId", "employeeId");

-- CreateIndex
CREATE INDEX "dispatch_status_history_dispatchId_idx" ON "dispatch_status_history"("dispatchId");

-- CreateIndex
CREATE INDEX "dispatch_status_history_changedById_idx" ON "dispatch_status_history"("changedById");

-- CreateIndex
CREATE INDEX "shift_logs_driverId_idx" ON "shift_logs"("driverId");

-- CreateIndex
CREATE INDEX "shift_logs_date_idx" ON "shift_logs"("date");

-- CreateIndex
CREATE INDEX "expenses_loggerId_idx" ON "expenses"("loggerId");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE INDEX "expenses_vehicleId_idx" ON "expenses"("vehicleId");

-- CreateIndex
CREATE INDEX "expenses_machineId_idx" ON "expenses"("machineId");

-- CreateIndex
CREATE INDEX "cash_collections_operatorId_idx" ON "cash_collections"("operatorId");

-- CreateIndex
CREATE INDEX "cash_collections_status_idx" ON "cash_collections"("status");

-- CreateIndex
CREATE INDEX "cash_collections_date_idx" ON "cash_collections"("date");

-- CreateIndex
CREATE INDEX "salary_advances_employeeId_idx" ON "salary_advances"("employeeId");

-- CreateIndex
CREATE INDEX "salary_advances_status_idx" ON "salary_advances"("status");

-- CreateIndex
CREATE INDEX "manual_adjustments_employeeId_idx" ON "manual_adjustments"("employeeId");

-- CreateIndex
CREATE INDEX "manual_adjustments_createdById_idx" ON "manual_adjustments"("createdById");

-- CreateIndex
CREATE INDEX "manual_adjustments_approvedById_idx" ON "manual_adjustments"("approvedById");

-- CreateIndex
CREATE INDEX "manual_adjustments_settlementStatus_idx" ON "manual_adjustments"("settlementStatus");

-- CreateIndex
CREATE INDEX "manual_adjustments_status_idx" ON "manual_adjustments"("status");

-- CreateIndex
CREATE INDEX "settlements_operatorId_idx" ON "settlements"("operatorId");

-- CreateIndex
CREATE INDEX "settlements_weekEnding_idx" ON "settlements"("weekEnding");

-- CreateIndex
CREATE INDEX "settlements_status_idx" ON "settlements"("status");

-- CreateIndex
CREATE UNIQUE INDEX "settlements_operatorId_weekEnding_key" ON "settlements"("operatorId", "weekEnding");

-- CreateIndex
CREATE INDEX "audit_logs_entityId_idx" ON "audit_logs"("entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_dispatches" ADD CONSTRAINT "daily_dispatches_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_dispatches" ADD CONSTRAINT "daily_dispatches_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_dispatches" ADD CONSTRAINT "daily_dispatches_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_dispatches" ADD CONSTRAINT "daily_dispatches_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_dispatches" ADD CONSTRAINT "daily_dispatches_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_dispatches" ADD CONSTRAINT "daily_dispatches_mainHelperId_fkey" FOREIGN KEY ("mainHelperId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_dispatches" ADD CONSTRAINT "daily_dispatches_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_machines" ADD CONSTRAINT "dispatch_machines_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "daily_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_machines" ADD CONSTRAINT "dispatch_machines_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_assets" ADD CONSTRAINT "dispatch_assets_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "daily_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_assets" ADD CONSTRAINT "dispatch_assets_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_tools" ADD CONSTRAINT "dispatch_tools_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "daily_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_tools" ADD CONSTRAINT "dispatch_tools_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_labor_crews" ADD CONSTRAINT "dispatch_labor_crews_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "daily_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_labor_crews" ADD CONSTRAINT "dispatch_labor_crews_internalEmployeeId_fkey" FOREIGN KEY ("internalEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_operators_v11" ADD CONSTRAINT "dispatch_operators_v11_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "daily_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_operators_v11" ADD CONSTRAINT "dispatch_operators_v11_internalEmployeeId_fkey" FOREIGN KEY ("internalEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_workers" ADD CONSTRAINT "dispatch_workers_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "daily_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_workers" ADD CONSTRAINT "dispatch_workers_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_status_history" ADD CONSTRAINT "dispatch_status_history_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "daily_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_status_history" ADD CONSTRAINT "dispatch_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_logs" ADD CONSTRAINT "shift_logs_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_logs" ADD CONSTRAINT "shift_logs_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_loggerId_fkey" FOREIGN KEY ("loggerId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_collections" ADD CONSTRAINT "cash_collections_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_collections" ADD CONSTRAINT "cash_collections_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "daily_dispatches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_collections" ADD CONSTRAINT "cash_collections_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_advances" ADD CONSTRAINT "salary_advances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_adjustments" ADD CONSTRAINT "manual_adjustments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_adjustments" ADD CONSTRAINT "manual_adjustments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_adjustments" ADD CONSTRAINT "manual_adjustments_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_finalizedById_fkey" FOREIGN KEY ("finalizedById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
