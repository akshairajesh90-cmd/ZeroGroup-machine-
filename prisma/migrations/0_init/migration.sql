-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AdjustmentStatus" AS ENUM ('PENDING', 'SETTLED');

-- CreateEnum
CREATE TYPE "public"."AdjustmentType" AS ENUM ('BONUS', 'PENALTY');

-- CreateEnum
CREATE TYPE "public"."CashDepositStatus" AS ENUM ('PENDING_DEPOSIT', 'DEPOSITED');

-- CreateEnum
CREATE TYPE "public"."CrewRole" AS ENUM ('MIXER_OPERATOR', 'HYDRAULIC_OPERATOR', 'VIBRATOR_OPERATOR', 'LIFT_OPERATOR', 'WORKER_LEADER', 'HELPER', 'DRIVER', 'SUB_LEADER', 'PANI_HELPER', 'TROLLY_1_WHEEL', 'TROLLY_2_WHEEL', 'P_VIBRATOR');

-- CreateEnum
CREATE TYPE "public"."DispatchStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS', 'DELIVERED', 'PICKED_UP', 'COMPLETED', 'CANCELLED', 'POSTPONED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('RC', 'INSURANCE', 'FITNESS', 'POLLUTION', 'LICENSE', 'ID_PROOF', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ExpenseCategory" AS ENUM ('DIESEL', 'REPAIR', 'TRAVEL', 'OTHER', 'STAFF_ADVANCE', 'OUTSIDE_HELPER_WAGE', 'TOOL_PARTS', 'WORKSHOP', 'RENT', 'PETTY_CASH', 'CONTRACTOR_ADVANCE');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIAL', 'PAID', 'CANCELLED', 'UNPAID');

-- CreateEnum
CREATE TYPE "public"."MachineStatus" AS ENUM ('AVAILABLE', 'RENTED', 'REPAIR', 'RETIRED');

-- CreateEnum
CREATE TYPE "public"."MachineType" AS ENUM ('MIXER', 'LIFT', 'VIBRATOR', 'PANI', 'INDEPENDENT', 'HYDRAULIC_MIXER');

-- CreateEnum
CREATE TYPE "public"."MaintenanceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "public"."ManualAdjustmentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."MixerCategory" AS ENUM ('STANDARD', 'HYDRAULIC');

-- CreateEnum
CREATE TYPE "public"."OperatorType" AS ENUM ('INTERNAL', 'SUBCONTRACTOR');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('UPI', 'CASH', 'CHEQUE', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('OWNER', 'ADMIN', 'STAFF', 'DRIVER', 'OPERATOR', 'WORKER');

-- CreateEnum
CREATE TYPE "public"."SettlementStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PENDING', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "public"."ToolReturnStatus" AS ENUM ('PENDING', 'RETURNED', 'LEFT_ON_SITE', 'MISSING', 'DAMAGED');

-- CreateEnum
CREATE TYPE "public"."ToolStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'REPAIR');

-- CreateEnum
CREATE TYPE "public"."VehicleStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'REPAIR', 'RETIRED');

-- CreateEnum
CREATE TYPE "public"."VibratorType" AS ENUM ('PETROL', 'ELECTRIC');

-- CreateEnum
CREATE TYPE "public"."WorkType" AS ENUM ('NORMAL', 'TROLLY', 'LATE');

-- CreateTable
CREATE TABLE "public"."PaymentRecord" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" TEXT NOT NULL,
    "collectedById" TEXT NOT NULL,
    "verifiedByStaff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SalaryAdvance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attendance_logs" (
    "id" TEXT NOT NULL,
    "fieldDiaryLogId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "isPresent" BOOLEAN NOT NULL DEFAULT true,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "actorRole" "public"."Role" NOT NULL,
    "modelName" TEXT,
    "newPayload" JSONB,
    "oldPayload" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entity" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cash_collections" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "amountCollected" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "status" "public"."CashDepositStatus" NOT NULL DEFAULT 'PENDING_DEPOSIT',
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPendingDelete" BOOLEAN NOT NULL DEFAULT false,
    "markedForDeleteBy" TEXT,

    CONSTRAINT "cash_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."chat_messages" (
    "id" TEXT NOT NULL,
    "text" TEXT,
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "senderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isPendingDelete" BOOLEAN NOT NULL DEFAULT false,
    "markedForDeleteBy" TEXT,
    "receiverId" TEXT,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."contractors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPendingDelete" BOOLEAN NOT NULL DEFAULT false,
    "markedForDeleteBy" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."daily_dispatches" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "machineId" TEXT,
    "liftId" TEXT,
    "vibratorId" TEXT,
    "driverId" TEXT,
    "operatorId" TEXT,
    "workerId" TEXT,
    "mainHelperId" TEXT,
    "location" TEXT NOT NULL,
    "mapLink" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "dateOfService" DATE NOT NULL,
    "workType" "public"."WorkType" NOT NULL DEFAULT 'NORMAL',
    "status" "public"."DispatchStatus" NOT NULL DEFAULT 'PENDING',
    "operatorDailyRate" DECIMAL(10,2),
    "customerCharge" DECIMAL(10,2),
    "notes" TEXT,
    "liftFloors" INTEGER DEFAULT 1,
    "mixerCategory" "public"."MixerCategory" DEFAULT 'STANDARD',
    "vibratorType" "public"."VibratorType",
    "hasTrollyBench" BOOLEAN NOT NULL DEFAULT false,
    "cementBags" INTEGER DEFAULT 0,
    "mainHelperName" TEXT,
    "helperCount" INTEGER NOT NULL DEFAULT 0,
    "trollyWorkerCount" INTEGER NOT NULL DEFAULT 0,
    "customOperatorWage" DECIMAL(10,2),
    "actualWagePaid" DECIMAL(10,2) DEFAULT 0,
    "machineNumberTag" TEXT,
    "publicTransportUsed" BOOLEAN NOT NULL DEFAULT false,
    "siteBundleId" TEXT,
    "isScopeFinalized" BOOLEAN NOT NULL DEFAULT false,
    "closingWorkNotes" TEXT,
    "invoiceId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT,
    "siteLeaderEmployeeId" TEXT,
    "conflictReport" TEXT,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "isPendingDelete" BOOLEAN NOT NULL DEFAULT false,
    "markedForDeleteBy" TEXT,
    "cashCollected" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "jobGroupId" TEXT,
    "externalSubLeaderName" TEXT,
    "arrivedOperatorIds" TEXT[],
    "deliveredAt" TIMESTAMP(3),
    "deliveredByDriverId" TEXT,
    "deliveredToolIds" TEXT[],
    "returnedToolIds" TEXT[],
    "isPrimaryBillingRow" BOOLEAN NOT NULL DEFAULT false,
    "toolRent" DECIMAL(10,2) DEFAULT 0,
    "routeStopOrder" INTEGER DEFAULT 1,
    "vehicleId" TEXT,
    "accessLatitude" DECIMAL(10,7),
    "accessLongitude" DECIMAL(10,7),
    "dwellConfidence" DOUBLE PRECISION,
    "dwellDurationMins" DOUBLE PRECISION,
    "isCentroidVerified" BOOLEAN DEFAULT false,
    "isOffRoad" BOOLEAN DEFAULT false,
    "offRoadBearingDeg" DOUBLE PRECISION,
    "offRoadDistanceM" DOUBLE PRECISION,
    "structuralAnchor" TEXT,
    "subLocality" TEXT,
    "locationOverrideReason" TEXT,
    "locationSource" TEXT,
    "locationUpdatedAt" TIMESTAMP(3),
    "locationUpdatedById" TEXT,

    CONSTRAINT "daily_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dispatch_assets" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,

    CONSTRAINT "dispatch_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dispatch_assignments" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "employeeId" TEXT,
    "assignedRole" "public"."CrewRole" NOT NULL,
    "lockedWageRate" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contractorId" TEXT,
    "headcount" INTEGER NOT NULL DEFAULT 1,
    "settlementId" TEXT,

    CONSTRAINT "dispatch_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dispatch_labor_crews" (
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
CREATE TABLE "public"."dispatch_machines" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,

    CONSTRAINT "dispatch_machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dispatch_photos" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "fieldDiaryLogId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "caption" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dispatch_status_history" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "oldStatus" "public"."DispatchStatus" NOT NULL,
    "newStatus" "public"."DispatchStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispatch_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."dispatch_tools" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "variant" TEXT,
    "returnNote" TEXT,
    "returnStatus" "public"."ToolReturnStatus" NOT NULL DEFAULT 'PENDING',
    "returnedAt" TIMESTAMP(3),

    CONSTRAINT "dispatch_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_documents" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "public"."DocumentType" NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "issueDate" DATE NOT NULL,
    "expiryDate" DATE NOT NULL,
    "attachmentUrl" TEXT NOT NULL,
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPendingDelete" BOOLEAN NOT NULL DEFAULT false,
    "markedForDeleteBy" TEXT,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employee_role_rates" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "crewRole" "public"."CrewRole" NOT NULL,
    "wagePerDay" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_role_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL,
    "fixedSalary" DECIMAL(10,2),
    "userId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "lastLatitude" DECIMAL(10,7),
    "lastLongitude" DECIMAL(10,7),
    "lastLocationUpdate" TIMESTAMP(3),
    "lastSyncStatus" TEXT DEFAULT 'ONLINE',
    "offlineQueueCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isOwner_ExcludeFromPayroll" BOOLEAN NOT NULL DEFAULT false,
    "isPendingDelete" BOOLEAN NOT NULL DEFAULT false,
    "markedForDeleteBy" TEXT,
    "baseDailyWage" DECIMAL(10,2),
    "dailyBataRate" DECIMAL(10,2),
    "hourlyRate" DECIMAL(10,2),
    "phone" TEXT,
    "isCrewLeader" BOOLEAN NOT NULL DEFAULT false,
    "operatorType" "public"."OperatorType" NOT NULL DEFAULT 'INTERNAL',
    "profilePhotoUrl" TEXT,
    "defaultCrewRole" "public"."CrewRole",
    "capableRoles" "public"."CrewRole"[],
    "gpayNumber" TEXT,
    "upiId" TEXT,
    "address" TEXT,
    "drivingLicenseNumber" TEXT,
    "employeeCode" TEXT,
    "idVerifiedAt" TIMESTAMP(3),
    "idVerifiedBy" TEXT,
    "idVerifiedRole" TEXT,
    "isIdVerified" BOOLEAN NOT NULL DEFAULT false,
    "officialIdNumber" TEXT,
    "officialIdType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."equipment_verification_logs" (
    "id" TEXT NOT NULL,
    "fieldDiaryLogId" TEXT NOT NULL,
    "dispatchToolId" TEXT NOT NULL,
    "isReturned" BOOLEAN NOT NULL DEFAULT true,
    "condition" TEXT NOT NULL DEFAULT 'OK',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_verification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expenses" (
    "id" TEXT NOT NULL,
    "loggerId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "category" "public"."ExpenseCategory" NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "vehicleId" TEXT,
    "machineId" TEXT,
    "notes" TEXT,
    "isAlertTriggered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPendingDelete" BOOLEAN NOT NULL DEFAULT false,
    "markedForDeleteBy" TEXT,
    "dispatchId" TEXT,
    "employeeId" TEXT,
    "toolId" TEXT,
    "contractorId" TEXT,
    "settlementId" TEXT,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."external_labor_logs" (
    "id" TEXT NOT NULL,
    "fieldDiaryLogId" TEXT NOT NULL,
    "subLeaderName" TEXT NOT NULL,
    "workerCount" INTEGER NOT NULL,
    "cashPaid" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_labor_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."external_sub_leaders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "defaultWorkerRate" DECIMAL(10,2),

    CONSTRAINT "external_sub_leaders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."field_diary_logs" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "loggedByLeaderId" TEXT,
    "date" DATE NOT NULL,
    "siteStatus" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "arrivalTime" TIMESTAMP(3),
    "departureTime" TIMESTAMP(3),
    "internalHelperCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isStaffOverridden" BOOLEAN NOT NULL DEFAULT false,
    "overriddenAt" TIMESTAMP(3),
    "overriddenById" TEXT,

    CONSTRAINT "field_diary_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fuel_logs" (
    "id" TEXT NOT NULL,
    "machineId" TEXT,
    "vehicleId" TEXT,
    "driverId" TEXT NOT NULL,
    "liters" DECIMAL(8,2) NOT NULL,
    "totalCost" DECIMAL(12,2) NOT NULL,
    "odometerReading" INTEGER,
    "receiptUrl" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "isPendingDelete" BOOLEAN NOT NULL DEFAULT false,
    "markedForDeleteBy" TEXT,

    CONSTRAINT "fuel_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_items" (
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
CREATE TABLE "public"."invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "advanceDeducted" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paidCash" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paidUpi" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paidBank" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentMethod" "public"."PaymentMethod",
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "siteLocation" TEXT,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPendingDelete" BOOLEAN NOT NULL DEFAULT false,
    "markedForDeleteBy" TEXT,
    "paidCheque" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."location_pings" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "dispatchId" TEXT,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'CAPACITOR',
    "sessionId" VARCHAR(64),
    "seq" INTEGER,

    CONSTRAINT "location_pings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."machines" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "type" "public"."MachineType" NOT NULL,
    "status" "public"."MachineStatus" NOT NULL DEFAULT 'AVAILABLE',
    "operatorDailyPayout" DECIMAL(10,2) NOT NULL,
    "fuelConsumptionThreshold" DECIMAL(10,2) NOT NULL DEFAULT 2000,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPendingDelete" BOOLEAN NOT NULL DEFAULT false,
    "markedForDeleteBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."maintenance_tickets" (
    "id" TEXT NOT NULL,
    "machineId" TEXT,
    "vehicleId" TEXT,
    "issueDescription" TEXT NOT NULL,
    "mechanicName" TEXT,
    "partsCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "laborCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "public"."MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPendingDelete" BOOLEAN NOT NULL DEFAULT false,
    "markedForDeleteBy" TEXT,

    CONSTRAINT "maintenance_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."manual_adjustments" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "public"."AdjustmentType" NOT NULL,
    "reason" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "settlementStatus" "public"."AdjustmentStatus" NOT NULL DEFAULT 'PENDING',
    "status" "public"."ManualAdjustmentStatus" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvalStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "isPendingDelete" BOOLEAN NOT NULL DEFAULT false,
    "markedForDeleteBy" TEXT,

    CONSTRAINT "manual_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_receipts" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "public"."PaymentMethod" NOT NULL,
    "paymentDate" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "depositStatus" TEXT DEFAULT 'PENDING_DEPOSIT',
    "collectedByEmployeeId" TEXT,
    "dispatchId" TEXT,
    "isPendingDelete" BOOLEAN NOT NULL DEFAULT false,
    "markedForDeleteBy" TEXT,

    CONSTRAINT "payment_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."settlements" (
    "id" TEXT NOT NULL,
    "weekEnding" DATE NOT NULL,
    "finalPayout" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "status" "public"."SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "contractorId" TEXT,
    "employeeId" TEXT,

    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shift_logs" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPendingDelete" BOOLEAN NOT NULL DEFAULT false,
    "markedForDeleteBy" TEXT,

    CONSTRAINT "shift_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."site_dwell_clusters" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT,
    "employeeId" TEXT,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "clusterRadiusM" DOUBLE PRECISION NOT NULL,
    "durationMins" DOUBLE PRECISION NOT NULL,
    "pingCount" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_dwell_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."site_labor_disbursements" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "internalOperatorId" TEXT NOT NULL,
    "subLeaderId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalCashHandedOut" DECIMAL(10,2) NOT NULL,
    "externalWorkerNames" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_labor_disbursements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."system_settings" (
    "id" TEXT NOT NULL,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeAddress" TEXT DEFAULT 'Pala, Kottayam, Kerala',
    "storeLatitude" DECIMAL(10,7) DEFAULT 9.5916,
    "storeLongitude" DECIMAL(10,7) DEFAULT 76.5222,
    "storeName" TEXT DEFAULT 'Zero Group Main Yard & Store',
    "companyPhone" TEXT DEFAULT '+91 94471 23456',
    "whatsappNumber" TEXT DEFAULT '919447123456',
    "companyEmail" TEXT DEFAULT 'operations@zerogroup.in',
    "gstinNumber" TEXT DEFAULT '32AAACZ0000A1Z5',
    "heroHeadline" TEXT DEFAULT 'Heavy Construction Equipment & Precision Plant Logistics',
    "heroSubheadline" TEXT DEFAULT 'Commercial concrete mixers, vertical material hoists, and heavy de-watering plant supplied across Kerala with certified operators.',
    "publicNotice" TEXT DEFAULT 'Full equipment fleet operational across Central Kerala. Direct flatbed site dispatch active.',
    "maintenanceNotice" TEXT DEFAULT 'Scheduled fleet maintenance window. Emergency plant dispatch active via helpline.',
    "districtsCovered" TEXT[] DEFAULT ARRAY['Kottayam', 'Ernakulam', 'Idukki', 'Alappuzha', 'Pathanamthitta', 'Thrissur', 'Kollam', 'Palakkad', 'Thiruvananthapuram', 'Malappuram', 'Kozhikode', 'Kannur', 'Wayanad', 'Kasaragod']::TEXT[],
    "emergencyPhone" TEXT DEFAULT '+91 94471 23456',
    "footerCopy" TEXT DEFAULT 'ZERO GROUP Equipment Rentals. All commercial plant certified under Kerala industrial equipment safety guidelines.',
    "heroBadge" TEXT DEFAULT 'KERALA COMMERCIAL INFRASTRUCTURE & CONSTRUCTION LOGISTICS',
    "heroPrimaryCta" TEXT DEFAULT 'Request Hire Quotation',
    "heroSecondaryCta" TEXT DEFAULT 'Search Plant Inventory',
    "catalogHeading" TEXT DEFAULT 'Certified Construction Machinery Catalog',
    "catalogSubheading" TEXT DEFAULT 'All machinery is serviced, pressure-tested, and certified prior to site mobilization.',
    "headerSubtitle" TEXT DEFAULT 'Commercial Construction Machinery & Lift Rentals',
    "inquiryHeading" TEXT DEFAULT 'Request Machinery Hire Quotation',
    "inquirySubheading" TEXT DEFAULT 'Submit your project schedule below. Central Yard dispatch will confirm machine availability and issue formal hire rates.',
    "operatingHours" TEXT DEFAULT 'Mon – Sun: 6:00 AM – 9:00 PM',

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tools" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "toolType" TEXT,
    "totalInventory" INTEGER NOT NULL DEFAULT 10,
    "status" "public"."ToolStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPendingDelete" BOOLEAN NOT NULL DEFAULT false,
    "markedForDeleteBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "dailyRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "repairCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'DRIVER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sessionTokenVersion" INTEGER NOT NULL DEFAULT 1,
    "displayPassword" TEXT,
    "resetOtp" TEXT,
    "resetOtpExpires" TIMESTAMP(3),
    "resetRequestNotes" TEXT,
    "resetRequested" BOOLEAN NOT NULL DEFAULT false,
    "resetRequestedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vehicle_documents" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "public"."DocumentType" NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "issueDate" DATE NOT NULL,
    "expiryDate" DATE NOT NULL,
    "attachmentUrl" TEXT NOT NULL,
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPendingDelete" BOOLEAN NOT NULL DEFAULT false,
    "markedForDeleteBy" TEXT,

    CONSTRAINT "vehicle_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vehicles" (
    "id" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "public"."VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPendingDelete" BOOLEAN NOT NULL DEFAULT false,
    "markedForDeleteBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."website_catalog_items" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "categorySubtext" TEXT,
    "categoryIcon" TEXT NOT NULL DEFAULT 'Cog',
    "title" TEXT NOT NULL,
    "power" TEXT NOT NULL,
    "specs" TEXT[],
    "idealFor" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "demandTag" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "imageUrl" TEXT,

    CONSTRAINT "website_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."website_value_props" (
    "id" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconName" TEXT NOT NULL DEFAULT 'Truck',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_value_props_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."work_type_rates" (
    "id" TEXT NOT NULL,
    "machineType" "public"."MachineType" NOT NULL,
    "workType" "public"."WorkType" NOT NULL,
    "payoutRate" DECIMAL(10,2) NOT NULL,
    "customerCharge" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_type_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentRecord_collectedById_idx" ON "public"."PaymentRecord"("collectedById" ASC);

-- CreateIndex
CREATE INDEX "PaymentRecord_dispatchId_idx" ON "public"."PaymentRecord"("dispatchId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_logs_fieldDiaryLogId_employeeId_key" ON "public"."attendance_logs"("fieldDiaryLogId" ASC, "employeeId" ASC);

-- CreateIndex
CREATE INDEX "attendance_logs_fieldDiaryLogId_idx" ON "public"."attendance_logs"("fieldDiaryLogId" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_actionType_idx" ON "public"."audit_logs"("actionType" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "public"."audit_logs"("actorId" ASC);

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "public"."audit_logs"("timestamp" ASC);

-- CreateIndex
CREATE INDEX "cash_collections_date_idx" ON "public"."cash_collections"("date" ASC);

-- CreateIndex
CREATE INDEX "cash_collections_operatorId_idx" ON "public"."cash_collections"("operatorId" ASC);

-- CreateIndex
CREATE INDEX "cash_collections_status_idx" ON "public"."cash_collections"("status" ASC);

-- CreateIndex
CREATE INDEX "chat_messages_createdAt_idx" ON "public"."chat_messages"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "chat_messages_receiverId_idx" ON "public"."chat_messages"("receiverId" ASC);

-- CreateIndex
CREATE INDEX "chat_messages_senderId_idx" ON "public"."chat_messages"("senderId" ASC);

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "public"."customers"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "daily_dispatches_dateOfService_customerId_siteBundleId_key" ON "public"."daily_dispatches"("dateOfService" ASC, "customerId" ASC, "siteBundleId" ASC);

-- CreateIndex
CREATE INDEX "daily_dispatches_dateOfService_idx" ON "public"."daily_dispatches"("dateOfService" ASC);

-- CreateIndex
CREATE INDEX "daily_dispatches_driverId_idx" ON "public"."daily_dispatches"("driverId" ASC);

-- CreateIndex
CREATE INDEX "daily_dispatches_invoiceId_idx" ON "public"."daily_dispatches"("invoiceId" ASC);

-- CreateIndex
CREATE INDEX "daily_dispatches_operatorId_idx" ON "public"."daily_dispatches"("operatorId" ASC);

-- CreateIndex
CREATE INDEX "daily_dispatches_siteBundleId_idx" ON "public"."daily_dispatches"("siteBundleId" ASC);

-- CreateIndex
CREATE INDEX "daily_dispatches_siteLeaderEmployeeId_idx" ON "public"."daily_dispatches"("siteLeaderEmployeeId" ASC);

-- CreateIndex
CREATE INDEX "daily_dispatches_status_idx" ON "public"."daily_dispatches"("status" ASC);

-- CreateIndex
CREATE INDEX "daily_dispatches_vehicleId_idx" ON "public"."daily_dispatches"("vehicleId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_assets_dispatchId_machineId_key" ON "public"."dispatch_assets"("dispatchId" ASC, "machineId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_assignments_dispatchId_contractorId_key" ON "public"."dispatch_assignments"("dispatchId" ASC, "contractorId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_assignments_dispatchId_employeeId_key" ON "public"."dispatch_assignments"("dispatchId" ASC, "employeeId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_machines_dispatchId_machineId_key" ON "public"."dispatch_machines"("dispatchId" ASC, "machineId" ASC);

-- CreateIndex
CREATE INDEX "dispatch_photos_dispatchId_idx" ON "public"."dispatch_photos"("dispatchId" ASC);

-- CreateIndex
CREATE INDEX "dispatch_photos_fieldDiaryLogId_idx" ON "public"."dispatch_photos"("fieldDiaryLogId" ASC);

-- CreateIndex
CREATE INDEX "dispatch_status_history_changedById_idx" ON "public"."dispatch_status_history"("changedById" ASC);

-- CreateIndex
CREATE INDEX "dispatch_status_history_dispatchId_idx" ON "public"."dispatch_status_history"("dispatchId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_tools_dispatchId_toolId_variant_key" ON "public"."dispatch_tools"("dispatchId" ASC, "toolId" ASC, "variant" ASC);

-- CreateIndex
CREATE INDEX "employee_documents_employeeId_idx" ON "public"."employee_documents"("employeeId" ASC);

-- CreateIndex
CREATE INDEX "employee_documents_status_idx" ON "public"."employee_documents"("status" ASC);

-- CreateIndex
CREATE INDEX "employee_documents_type_idx" ON "public"."employee_documents"("type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "employee_role_rates_employeeId_crewRole_key" ON "public"."employee_role_rates"("employeeId" ASC, "crewRole" ASC);

-- CreateIndex
CREATE INDEX "employees_isActive_idx" ON "public"."employees"("isActive" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "employees_phone_key" ON "public"."employees"("phone" ASC);

-- CreateIndex
CREATE INDEX "employees_role_idx" ON "public"."employees"("role" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "public"."employees"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "equipment_verification_logs_fieldDiaryLogId_dispatchToolId_key" ON "public"."equipment_verification_logs"("fieldDiaryLogId" ASC, "dispatchToolId" ASC);

-- CreateIndex
CREATE INDEX "equipment_verification_logs_fieldDiaryLogId_idx" ON "public"."equipment_verification_logs"("fieldDiaryLogId" ASC);

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "public"."expenses"("date" ASC);

-- CreateIndex
CREATE INDEX "expenses_loggerId_idx" ON "public"."expenses"("loggerId" ASC);

-- CreateIndex
CREATE INDEX "expenses_machineId_idx" ON "public"."expenses"("machineId" ASC);

-- CreateIndex
CREATE INDEX "expenses_settlementId_idx" ON "public"."expenses"("settlementId" ASC);

-- CreateIndex
CREATE INDEX "expenses_vehicleId_idx" ON "public"."expenses"("vehicleId" ASC);

-- CreateIndex
CREATE INDEX "external_labor_logs_fieldDiaryLogId_idx" ON "public"."external_labor_logs"("fieldDiaryLogId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "field_diary_logs_dispatchId_date_key" ON "public"."field_diary_logs"("dispatchId" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "field_diary_logs_dispatchId_idx" ON "public"."field_diary_logs"("dispatchId" ASC);

-- CreateIndex
CREATE INDEX "field_diary_logs_loggedByLeaderId_idx" ON "public"."field_diary_logs"("loggedByLeaderId" ASC);

-- CreateIndex
CREATE INDEX "fuel_logs_date_idx" ON "public"."fuel_logs"("date" ASC);

-- CreateIndex
CREATE INDEX "fuel_logs_driverId_idx" ON "public"."fuel_logs"("driverId" ASC);

-- CreateIndex
CREATE INDEX "fuel_logs_machineId_idx" ON "public"."fuel_logs"("machineId" ASC);

-- CreateIndex
CREATE INDEX "fuel_logs_vehicleId_idx" ON "public"."fuel_logs"("vehicleId" ASC);

-- CreateIndex
CREATE INDEX "invoice_items_invoiceId_idx" ON "public"."invoice_items"("invoiceId" ASC);

-- CreateIndex
CREATE INDEX "invoices_customerId_idx" ON "public"."invoices"("customerId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "public"."invoices"("invoiceNumber" ASC);

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "public"."invoices"("status" ASC);

-- CreateIndex
CREATE INDEX "location_pings_dispatchId_idx" ON "public"."location_pings"("dispatchId" ASC);

-- CreateIndex
CREATE INDEX "location_pings_employeeId_idx" ON "public"."location_pings"("employeeId" ASC);

-- CreateIndex
CREATE INDEX "location_pings_sessionId_seq_idx" ON "public"."location_pings"("sessionId" ASC, "seq" ASC);

-- CreateIndex
CREATE INDEX "location_pings_timestamp_idx" ON "public"."location_pings"("timestamp" ASC);

-- CreateIndex
CREATE INDEX "machines_isActive_idx" ON "public"."machines"("isActive" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "machines_machineId_key" ON "public"."machines"("machineId" ASC);

-- CreateIndex
CREATE INDEX "machines_status_idx" ON "public"."machines"("status" ASC);

-- CreateIndex
CREATE INDEX "maintenance_tickets_machineId_idx" ON "public"."maintenance_tickets"("machineId" ASC);

-- CreateIndex
CREATE INDEX "maintenance_tickets_status_idx" ON "public"."maintenance_tickets"("status" ASC);

-- CreateIndex
CREATE INDEX "maintenance_tickets_vehicleId_idx" ON "public"."maintenance_tickets"("vehicleId" ASC);

-- CreateIndex
CREATE INDEX "manual_adjustments_approvedById_idx" ON "public"."manual_adjustments"("approvedById" ASC);

-- CreateIndex
CREATE INDEX "manual_adjustments_createdById_idx" ON "public"."manual_adjustments"("createdById" ASC);

-- CreateIndex
CREATE INDEX "manual_adjustments_employeeId_idx" ON "public"."manual_adjustments"("employeeId" ASC);

-- CreateIndex
CREATE INDEX "manual_adjustments_settlementStatus_idx" ON "public"."manual_adjustments"("settlementStatus" ASC);

-- CreateIndex
CREATE INDEX "manual_adjustments_status_idx" ON "public"."manual_adjustments"("status" ASC);

-- CreateIndex
CREATE INDEX "payment_receipts_customerId_idx" ON "public"."payment_receipts"("customerId" ASC);

-- CreateIndex
CREATE INDEX "payment_receipts_depositStatus_idx" ON "public"."payment_receipts"("depositStatus" ASC);

-- CreateIndex
CREATE INDEX "payment_receipts_invoiceId_idx" ON "public"."payment_receipts"("invoiceId" ASC);

-- CreateIndex
CREATE INDEX "payment_receipts_paymentDate_idx" ON "public"."payment_receipts"("paymentDate" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payment_receipts_receiptNumber_key" ON "public"."payment_receipts"("receiptNumber" ASC);

-- CreateIndex
CREATE INDEX "settlements_contractorId_idx" ON "public"."settlements"("contractorId" ASC);

-- CreateIndex
CREATE INDEX "settlements_employeeId_idx" ON "public"."settlements"("employeeId" ASC);

-- CreateIndex
CREATE INDEX "settlements_status_idx" ON "public"."settlements"("status" ASC);

-- CreateIndex
CREATE INDEX "settlements_weekEnding_idx" ON "public"."settlements"("weekEnding" ASC);

-- CreateIndex
CREATE INDEX "shift_logs_date_idx" ON "public"."shift_logs"("date" ASC);

-- CreateIndex
CREATE INDEX "shift_logs_driverId_idx" ON "public"."shift_logs"("driverId" ASC);

-- CreateIndex
CREATE INDEX "site_dwell_clusters_dispatchId_idx" ON "public"."site_dwell_clusters"("dispatchId" ASC);

-- CreateIndex
CREATE INDEX "site_dwell_clusters_employeeId_idx" ON "public"."site_dwell_clusters"("employeeId" ASC);

-- CreateIndex
CREATE INDEX "tools_isActive_idx" ON "public"."tools"("isActive" ASC);

-- CreateIndex
CREATE INDEX "tools_status_idx" ON "public"."tools"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "tools_toolId_key" ON "public"."tools"("toolId" ASC);

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "public"."users"("isActive" ASC);

-- CreateIndex
CREATE INDEX "users_resetRequested_idx" ON "public"."users"("resetRequested" ASC);

-- CreateIndex
CREATE INDEX "vehicle_documents_status_idx" ON "public"."vehicle_documents"("status" ASC);

-- CreateIndex
CREATE INDEX "vehicle_documents_type_idx" ON "public"."vehicle_documents"("type" ASC);

-- CreateIndex
CREATE INDEX "vehicle_documents_vehicleId_idx" ON "public"."vehicle_documents"("vehicleId" ASC);

-- CreateIndex
CREATE INDEX "vehicles_isActive_idx" ON "public"."vehicles"("isActive" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_licensePlate_key" ON "public"."vehicles"("licensePlate" ASC);

-- CreateIndex
CREATE INDEX "vehicles_status_idx" ON "public"."vehicles"("status" ASC);

-- CreateIndex
CREATE INDEX "website_catalog_items_category_idx" ON "public"."website_catalog_items"("category" ASC);

-- CreateIndex
CREATE INDEX "website_catalog_items_isActive_idx" ON "public"."website_catalog_items"("isActive" ASC);

-- CreateIndex
CREATE INDEX "website_catalog_items_sortOrder_idx" ON "public"."website_catalog_items"("sortOrder" ASC);

-- CreateIndex
CREATE INDEX "website_value_props_isActive_idx" ON "public"."website_value_props"("isActive" ASC);

-- CreateIndex
CREATE INDEX "website_value_props_sortOrder_idx" ON "public"."website_value_props"("sortOrder" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "work_type_rates_machineType_workType_key" ON "public"."work_type_rates"("machineType" ASC, "workType" ASC);

-- AddForeignKey
ALTER TABLE "public"."PaymentRecord" ADD CONSTRAINT "PaymentRecord_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PaymentRecord" ADD CONSTRAINT "PaymentRecord_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "public"."daily_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_logs" ADD CONSTRAINT "attendance_logs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_logs" ADD CONSTRAINT "attendance_logs_fieldDiaryLogId_fkey" FOREIGN KEY ("fieldDiaryLogId") REFERENCES "public"."field_diary_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cash_collections" ADD CONSTRAINT "cash_collections_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cash_collections" ADD CONSTRAINT "cash_collections_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "public"."daily_dispatches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cash_collections" ADD CONSTRAINT "cash_collections_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."chat_messages" ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_dispatches" ADD CONSTRAINT "daily_dispatches_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_dispatches" ADD CONSTRAINT "daily_dispatches_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_dispatches" ADD CONSTRAINT "daily_dispatches_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_dispatches" ADD CONSTRAINT "daily_dispatches_liftId_fkey" FOREIGN KEY ("liftId") REFERENCES "public"."machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_dispatches" ADD CONSTRAINT "daily_dispatches_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "public"."machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_dispatches" ADD CONSTRAINT "daily_dispatches_mainHelperId_fkey" FOREIGN KEY ("mainHelperId") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_dispatches" ADD CONSTRAINT "daily_dispatches_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_dispatches" ADD CONSTRAINT "daily_dispatches_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_dispatches" ADD CONSTRAINT "daily_dispatches_siteLeaderEmployeeId_fkey" FOREIGN KEY ("siteLeaderEmployeeId") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_dispatches" ADD CONSTRAINT "daily_dispatches_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_dispatches" ADD CONSTRAINT "daily_dispatches_vibratorId_fkey" FOREIGN KEY ("vibratorId") REFERENCES "public"."machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_dispatches" ADD CONSTRAINT "daily_dispatches_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_assets" ADD CONSTRAINT "dispatch_assets_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "public"."daily_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_assets" ADD CONSTRAINT "dispatch_assets_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "public"."machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "public"."contractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "public"."daily_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_assignments" ADD CONSTRAINT "dispatch_assignments_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "public"."settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_labor_crews" ADD CONSTRAINT "dispatch_labor_crews_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "public"."daily_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_labor_crews" ADD CONSTRAINT "dispatch_labor_crews_internalEmployeeId_fkey" FOREIGN KEY ("internalEmployeeId") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_machines" ADD CONSTRAINT "dispatch_machines_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "public"."daily_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_machines" ADD CONSTRAINT "dispatch_machines_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "public"."machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_photos" ADD CONSTRAINT "dispatch_photos_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "public"."daily_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_photos" ADD CONSTRAINT "dispatch_photos_fieldDiaryLogId_fkey" FOREIGN KEY ("fieldDiaryLogId") REFERENCES "public"."field_diary_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_photos" ADD CONSTRAINT "dispatch_photos_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_status_history" ADD CONSTRAINT "dispatch_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_status_history" ADD CONSTRAINT "dispatch_status_history_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "public"."daily_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_tools" ADD CONSTRAINT "dispatch_tools_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "public"."daily_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."dispatch_tools" ADD CONSTRAINT "dispatch_tools_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "public"."tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_documents" ADD CONSTRAINT "employee_documents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employee_role_rates" ADD CONSTRAINT "employee_role_rates_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."equipment_verification_logs" ADD CONSTRAINT "equipment_verification_logs_dispatchToolId_fkey" FOREIGN KEY ("dispatchToolId") REFERENCES "public"."dispatch_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."equipment_verification_logs" ADD CONSTRAINT "equipment_verification_logs_fieldDiaryLogId_fkey" FOREIGN KEY ("fieldDiaryLogId") REFERENCES "public"."field_diary_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "public"."contractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "public"."daily_dispatches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_loggerId_fkey" FOREIGN KEY ("loggerId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "public"."machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "public"."settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "public"."tools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."external_labor_logs" ADD CONSTRAINT "external_labor_logs_fieldDiaryLogId_fkey" FOREIGN KEY ("fieldDiaryLogId") REFERENCES "public"."field_diary_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."field_diary_logs" ADD CONSTRAINT "field_diary_logs_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "public"."daily_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."field_diary_logs" ADD CONSTRAINT "field_diary_logs_loggedByLeaderId_fkey" FOREIGN KEY ("loggedByLeaderId") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."field_diary_logs" ADD CONSTRAINT "field_diary_logs_overriddenById_fkey" FOREIGN KEY ("overriddenById") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fuel_logs" ADD CONSTRAINT "fuel_logs_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fuel_logs" ADD CONSTRAINT "fuel_logs_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "public"."machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fuel_logs" ADD CONSTRAINT "fuel_logs_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."location_pings" ADD CONSTRAINT "location_pings_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "public"."daily_dispatches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."location_pings" ADD CONSTRAINT "location_pings_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "public"."machines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."maintenance_tickets" ADD CONSTRAINT "maintenance_tickets_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manual_adjustments" ADD CONSTRAINT "manual_adjustments_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manual_adjustments" ADD CONSTRAINT "manual_adjustments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."manual_adjustments" ADD CONSTRAINT "manual_adjustments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_receipts" ADD CONSTRAINT "payment_receipts_collectedByEmployeeId_fkey" FOREIGN KEY ("collectedByEmployeeId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_receipts" ADD CONSTRAINT "payment_receipts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_receipts" ADD CONSTRAINT "payment_receipts_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."settlements" ADD CONSTRAINT "settlements_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "public"."contractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."settlements" ADD CONSTRAINT "settlements_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_logs" ADD CONSTRAINT "shift_logs_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_logs" ADD CONSTRAINT "shift_logs_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."site_labor_disbursements" ADD CONSTRAINT "site_labor_disbursements_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "public"."daily_dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."site_labor_disbursements" ADD CONSTRAINT "site_labor_disbursements_internalOperatorId_fkey" FOREIGN KEY ("internalOperatorId") REFERENCES "public"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."site_labor_disbursements" ADD CONSTRAINT "site_labor_disbursements_subLeaderId_fkey" FOREIGN KEY ("subLeaderId") REFERENCES "public"."external_sub_leaders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "public"."vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

