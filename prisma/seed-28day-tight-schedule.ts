/**
 * IronRent ERP - 28-Day Comprehensive Tight Schedule & 100% Complete Database Seeder
 * Anchored at October 12, 2026:
 * - Past 14 Days:   Sep 28 – Oct 11, 2026 (Completed / Historical with full receipts & expense payouts)
 * - Today:          Oct 12, 2026 (Live in-progress operations, real-time GPS pings, active dispatches)
 * - Future 14 Days: Oct 13 – Oct 26, 2026 (Scheduled, confirmed, and planned dispatches)
 *
 * Populates EVERY SINGLE TABLE in Prisma Schema:
 * - User, Customer, Project, Invoice, InvoiceItem
 * - Machine, Tool, Vehicle, WorkTypeRate
 * - Employee, EmployeeRoleRate, EmployeeDocument, VehicleDocument
 * - DailyDispatch, DispatchMachine, DispatchAsset, DispatchTool, DispatchLabor, DispatchAssignment, DispatchStatusHistory
 * - LocationPing (Live GPS breadcrumbs in Kerala for all drivers & leaders)
 * - FieldDiaryLog, AttendanceLog, ExternalLaborLog, EquipmentVerificationLog, DispatchPhoto
 * - ShiftLog, Expense, CashCollection, PaymentReceipt, PaymentRecord
 * - SalaryAdvance, ManualAdjustment, Settlement
 * - Contractor, ExternalSubLeader, SiteLaborDisbursement
 * - ChatMessage, AuditLog, SystemSettings
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  Role,
  MachineStatus,
  DispatchStatus,
  MachineType,
  MixerCategory,
  VibratorType,
  VehicleStatus,
  WorkType,
  CrewRole,
  ToolStatus,
  SettlementStatus,
  ExpenseCategory,
  PaymentMethod,
  DocumentType,
  DocumentStatus,
  AdjustmentType,
  InvoiceStatus,
  Prisma,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, startOfDay, isWeekend, differenceInDays } from "date-fns";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:Akshai%402005@localhost:5432/postgres?schema=public",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error"] } as any);

// ─── DATE ANCHORS ────────────────────────────────────────────────────────────
const TODAY = startOfDay(new Date("2026-10-12"));
const SEED_START = new Date("2026-09-28"); // -14 days
const SEED_END   = new Date("2026-10-26"); // +14 days

// Standardized Daily Wage in ₹ INR
const WAGE: Record<CrewRole, number> = {
  MIXER_OPERATOR:     1200,
  HYDRAULIC_OPERATOR: 1300,
  VIBRATOR_OPERATOR:  1000,
  LIFT_OPERATOR:      1500,
  WORKER_LEADER:      1200,
  HELPER:             1200, // Flat basic worker rate ₹1200
  DRIVER:             900,
  SUB_LEADER:         1200,
  PANI_HELPER:        1200,
  TROLLY_1_WHEEL:     1200,
  TROLLY_2_WHEEL:     1200,
  P_VIBRATOR:         1000,
};

const LOCATIONS = [
  "Nadakkal Road Junction", "Mathamangalam Bypass", "Kunnoni Valley", "Vadakkan Site Phase 2",
  "Pookoth Heights", "Kanjirappally Central", "Unichamara Colony", "Noble Commercial Complex",
  "Odayakkal Residential", "Konippada Hills", "Ullanpara School Site", "Nellikunnu Township",
  "Pala River Road Project", "City Center Metro Link", "Erattupetta High Road", "Thodupuzha Highway",
];

// Base GPS points for Kerala locations (Pala, Kottayam, Kanjirappally region)
const GEO_LOCATIONS = [
  { name: "Pala", lat: 9.7125, lng: 76.6854 },
  { name: "Kanjirappally", lat: 9.5558, lng: 76.7877 },
  { name: "Erattupetta", lat: 9.6914, lng: 76.7828 },
  { name: "Kottayam Central", lat: 9.5916, lng: 76.5222 },
  { name: "Thodupuzha", lat: 9.8959, lng: 76.7184 },
];

type EmpObj = { id: string; name: string };

function det<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function pickUnused(pool: EmpObj[], used: Set<string>, seed: number): EmpObj | null {
  const avail = pool.filter(e => !used.has(e.id));
  if (!avail.length) return null;
  return avail[Math.abs(seed) % avail.length];
}

function formatDateCode(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}${m}${day}`;
}

async function main() {
  console.log("🚀 IronRent 100% Full-Coverage Database Seeder — Starting...\n");
  console.log(`📅 Timeline: ${SEED_START.toDateString()} to ${SEED_END.toDateString()} (Today: ${TODAY.toDateString()})`);

  // ════════════════════════════════════════════════════════════════════
  // PHASE 0 — CLEAN DATABASE
  // ════════════════════════════════════════════════════════════════════
  console.log("🗑️  Cleaning existing records...");
  await prisma.vehicleDocument.deleteMany({});
  await prisma.employeeDocument.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.shiftLog.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.equipmentVerificationLog.deleteMany({});
  await prisma.attendanceLog.deleteMany({});
  await prisma.externalLaborLog.deleteMany({});
  await prisma.dispatchPhoto.deleteMany({});
  await prisma.fieldDiaryLog.deleteMany({});
  await prisma.locationPing.deleteMany({});
  await prisma.dispatchStatusHistory.deleteMany({});
  await prisma.dispatchAssignment.deleteMany({});
  await prisma.dispatchTool.deleteMany({});
  await prisma.dispatchLabor.deleteMany({});
  await prisma.dispatchAsset.deleteMany({});
  await prisma.dispatchMachine.deleteMany({});
  await prisma.paymentRecord.deleteMany({});
  await prisma.paymentReceipt.deleteMany({});
  await prisma.cashCollection.deleteMany({});
  await prisma.siteLaborDisbursement.deleteMany({});
  await prisma.salaryAdvance.deleteMany({});
  await prisma.manualAdjustment.deleteMany({});
  await prisma.settlement.deleteMany({});
  await prisma.maintenanceTicket.deleteMany({});
  await prisma.fuelLog.deleteMany({});
  await prisma.dailyDispatch.deleteMany({});
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.tool.deleteMany({});
  await prisma.machine.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.employeeRoleRate.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.systemSettings.deleteMany({});
  await prisma.contractor.deleteMany({});
  await prisma.externalSubLeader.deleteMany({});
  await prisma.workTypeRate.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.user.deleteMany({});
  console.log("  ✅ Clean complete.\n");

  // ════════════════════════════════════════════════════════════════════
  // PHASE 1 — SYSTEM SETTINGS & CONTRACTORS
  // ════════════════════════════════════════════════════════════════════
  console.log("⚙️  Seeding System Settings & Contractors...");
  await prisma.systemSettings.create({
    data: { maintenanceMode: false },
  });

  const c1 = await prisma.contractor.create({ data: { name: "Apex Ready-Mix Partners", companyName: "Apex Infra Kerala Pvt Ltd", phone: "9847100010" } });
  const c2 = await prisma.contractor.create({ data: { name: "Kottayam Heavy Crane Logistics", companyName: "Kottayam Logistics LLP", phone: "9847100020" } });
  const c3 = await prisma.contractor.create({ data: { name: "Pala Tools & Hardware Supply", companyName: "Pala Tools Co", phone: "9847100030" } });
  const c4 = await prisma.contractor.create({ data: { name: "Travancore Aggregates & Cement", companyName: "Travancore Cement Corp", phone: "9847100040" } });
  const contractorPool = [c1, c2, c3, c4];

  const subLeader1 = await prisma.externalSubLeader.create({ data: { name: "Rajan Sub-Contract Team", phone: "9847999001", defaultWorkerRate: 1200 } });
  const subLeader2 = await prisma.externalSubLeader.create({ data: { name: "Suresh Concrete Group", phone: "9847999002", defaultWorkerRate: 1200 } });

  // ─── Work Type Rate Card ───────────────────────────────────────────
  const workTypeRates = [
    { machineType: MachineType.MIXER, workType: WorkType.NORMAL, payoutRate: 1200, customerCharge: 1000 },
    { machineType: MachineType.MIXER, workType: WorkType.TROLLY, payoutRate: 1200, customerCharge: 1500 },
    { machineType: MachineType.MIXER, workType: WorkType.LATE, payoutRate: 1500, customerCharge: 2000 },
    { machineType: MachineType.LIFT, workType: WorkType.NORMAL, payoutRate: 1500, customerCharge: 1700 },
    { machineType: MachineType.LIFT, workType: WorkType.LATE, payoutRate: 1800, customerCharge: 2500 },
    { machineType: MachineType.VIBRATOR, workType: WorkType.NORMAL, payoutRate: 1000, customerCharge: 0 },
    { machineType: MachineType.PANI, workType: WorkType.NORMAL, payoutRate: 900, customerCharge: 800 },
  ];
  for (const wr of workTypeRates) {
    await prisma.workTypeRate.create({ data: wr });
  }

  // ════════════════════════════════════════════════════════════════════
  // PHASE 2 — ROSTER, FLEET & SETUP TOOLS
  // ════════════════════════════════════════════════════════════════════
  console.log("👥 Seeding Users, Employees, Fleet & Tools...");
  const HASH = bcrypt.hashSync("password123", 10);
  const ADMIN_HASH = bcrypt.hashSync("admin123", 10);

  async function createEmp(
    name: string,
    email: string,
    role: Role,
    capableRoles: CrewRole[],
    phone: string,
    baseDailyWage: number = 1200,
    geo = GEO_LOCATIONS[0]
  ) {
    const u = await prisma.user.create({
      data: {
        email,
        hashedPassword: role === Role.OWNER ? ADMIN_HASH : HASH,
        role,
      },
    });
    const e = await prisma.employee.create({
      data: {
        name,
        role,
        userId: u.id,
        capableRoles,
        phone,
        gpayNumber: phone,
        upiId: `${phone}@okaxis`,
        baseDailyWage,
        lastSeenAt: new Date(),
        lastLatitude: new Prisma.Decimal(geo.lat),
        lastLongitude: new Prisma.Decimal(geo.lng),
        lastLocationUpdate: new Date(),
        lastSyncStatus: "ONLINE",
      },
    });

    // Seed Role Rates for every capable role
    for (const cr of capableRoles) {
      await prisma.employeeRoleRate.create({
        data: {
          employeeId: e.id,
          crewRole: cr,
          wagePerDay: WAGE[cr] || baseDailyWage,
        },
      });
    }

    // Seed Employee Document (ID Proof / License)
    await prisma.employeeDocument.create({
      data: {
        employeeId: e.id,
        type: role === Role.DRIVER ? DocumentType.LICENSE : DocumentType.ID_PROOF,
        documentNumber: `KL-${role.slice(0, 3)}-${phone.slice(-4)}`,
        issueDate: new Date("2024-01-15"),
        expiryDate: new Date("2029-01-15"),
        attachmentUrl: "/documents/sample-id-proof.pdf",
        status: DocumentStatus.ACTIVE,
      },
    });

    return { id: e.id, name: e.name };
  }

  // Management & Staff (Personal + Standard Demo Accounts)
  const owner      = await createEmp("Akshai Rajesh", "akshairajesh07@gmail.com", Role.OWNER, [], "9847000001", 0, GEO_LOCATIONS[0]);
  const ownerDemo  = await createEmp("Owner Admin", "owner@zerogroup.com", Role.OWNER, [], "9847000098", 0, GEO_LOCATIONS[0]);
  const adminDemo  = await createEmp("Zero Group Admin", "admin@zerogroup.com", Role.ADMIN, [], "9847000099", 0, GEO_LOCATIONS[0]);
  const staff1     = await createEmp("Priya Menon", "priya@zerogroup.in", Role.STAFF, [], "9847000002", 0, GEO_LOCATIONS[0]);
  const staffDemo  = await createEmp("Office Staff", "staff@zerogroup.com", Role.STAFF, [], "9847000097", 0, GEO_LOCATIONS[0]);

  // Drivers
  const drv1        = await createEmp("Suresh Kumar", "suresh@zerogroup.in", Role.DRIVER, [CrewRole.DRIVER], "9847111001", 900, GEO_LOCATIONS[1]);
  const drvDemo     = await createEmp("Fleet Driver Demo", "driver@zerogroup.com", Role.DRIVER, [CrewRole.DRIVER], "9847000096", 900, GEO_LOCATIONS[1]);
  const drv2        = await createEmp("Babu Antony", "babu@zerogroup.in", Role.DRIVER, [CrewRole.DRIVER], "9847111002", 900, GEO_LOCATIONS[2]);
  const drv3        = await createEmp("Rajan Pillai", "rajan@zerogroup.in", Role.DRIVER, [CrewRole.DRIVER], "9847111003", 900, GEO_LOCATIONS[3]);

  // Machine Operators
  const op1         = await createEmp("Rajesh Bhai", "rajesh@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.LIFT_OPERATOR, CrewRole.VIBRATOR_OPERATOR, CrewRole.P_VIBRATOR], "9847222001", 1200, GEO_LOCATIONS[0]);
  const opDemo      = await createEmp("Mixer Operator Demo", "operator@zerogroup.com", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.LIFT_OPERATOR, CrewRole.VIBRATOR_OPERATOR], "9847000095", 1200, GEO_LOCATIONS[0]);
  const op2     = await createEmp("Subil Kumar", "subil@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.LIFT_OPERATOR, CrewRole.VIBRATOR_OPERATOR, CrewRole.P_VIBRATOR], "9847222002", 1200, GEO_LOCATIONS[1]);
  const op3     = await createEmp("Pokkan", "pokkan@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.LIFT_OPERATOR, CrewRole.TROLLY_1_WHEEL, CrewRole.TROLLY_2_WHEEL, CrewRole.VIBRATOR_OPERATOR], "9847222003", 1200, GEO_LOCATIONS[2]);
  const op4     = await createEmp("Tapan", "tapan@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.HYDRAULIC_OPERATOR, CrewRole.TROLLY_1_WHEEL, CrewRole.TROLLY_2_WHEEL], "9847222004", 1300, GEO_LOCATIONS[3]);
  const op5     = await createEmp("Pulkith", "pulkith@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.TROLLY_1_WHEEL, CrewRole.TROLLY_2_WHEEL], "9847222005", 1200, GEO_LOCATIONS[4]);
  const op6     = await createEmp("Sanjay", "sanjay@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.HYDRAULIC_OPERATOR, CrewRole.TROLLY_1_WHEEL, CrewRole.TROLLY_2_WHEEL], "9847222006", 1300, GEO_LOCATIONS[0]);
  const op7     = await createEmp("Kailas", "kailas@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.HYDRAULIC_OPERATOR, CrewRole.VIBRATOR_OPERATOR], "9847222007", 1300, GEO_LOCATIONS[1]);
  const op8     = await createEmp("Tuna", "tuna@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.TROLLY_1_WHEEL, CrewRole.TROLLY_2_WHEEL], "9847222008", 1200, GEO_LOCATIONS[2]);
  const op9     = await createEmp("Mutta", "mutta@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.TROLLY_1_WHEEL, CrewRole.TROLLY_2_WHEEL], "9847222009", 1200, GEO_LOCATIONS[3]);
  const op10    = await createEmp("Amith", "amith@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.HYDRAULIC_OPERATOR, CrewRole.VIBRATOR_OPERATOR], "9847222010", 1300, GEO_LOCATIONS[4]);
  const op11    = await createEmp("Vijay", "vijay@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.VIBRATOR_OPERATOR], "9847222011", 1200, GEO_LOCATIONS[0]);
  const sharath = await createEmp("Sharath", "sharath@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.LIFT_OPERATOR, CrewRole.VIBRATOR_OPERATOR], "9847222012", 1500, GEO_LOCATIONS[1]);
  const uttam   = await createEmp("Uttam", "uttam@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.TROLLY_1_WHEEL, CrewRole.TROLLY_2_WHEEL], "9847222013", 1200, GEO_LOCATIONS[2]);

  // Direct Workers (Flat Rate: ₹1,200) - No mestri
  const wk1  = await createEmp("Biju", "biju@zerogroup.in", Role.WORKER, [CrewRole.HELPER, CrewRole.PANI_HELPER, CrewRole.TROLLY_1_WHEEL], "9847333001", 1200, GEO_LOCATIONS[0]);
  const wk2  = await createEmp("Shibu", "shibu@zerogroup.in", Role.WORKER, [CrewRole.HELPER, CrewRole.PANI_HELPER, CrewRole.TROLLY_2_WHEEL], "9847333002", 1200, GEO_LOCATIONS[1]);
  const wk3  = await createEmp("Manikandan", "mani@zerogroup.in", Role.WORKER, [CrewRole.HELPER, CrewRole.TROLLY_1_WHEEL], "9847333003", 1200, GEO_LOCATIONS[2]);
  const wk4  = await createEmp("Vijayan", "vijayan@zerogroup.in", Role.WORKER, [CrewRole.HELPER, CrewRole.TROLLY_2_WHEEL], "9847333004", 1200, GEO_LOCATIONS[3]);
  const wk5  = await createEmp("Jopin Kutty", "jopin@zerogroup.in", Role.WORKER, [CrewRole.HELPER, CrewRole.TROLLY_1_WHEEL], "9847333005", 1200, GEO_LOCATIONS[4]);
  const wk6  = await createEmp("Arumugam", "arumugam@zerogroup.in", Role.WORKER, [CrewRole.HELPER, CrewRole.PANI_HELPER], "9847333006", 1200, GEO_LOCATIONS[0]);
  const wk7  = await createEmp("Velu", "velu@zerogroup.in", Role.WORKER, [CrewRole.HELPER, CrewRole.TROLLY_2_WHEEL], "9847333007", 1200, GEO_LOCATIONS[1]);
  const wk8  = await createEmp("Murugan", "murugan@zerogroup.in", Role.WORKER, [CrewRole.HELPER, CrewRole.TROLLY_1_WHEEL], "9847333008", 1200, GEO_LOCATIONS[2]);
  const wk9  = await createEmp("Chinnasamy", "chinnasamy@zerogroup.in", Role.WORKER, [CrewRole.HELPER, CrewRole.TROLLY_2_WHEEL], "9847333009", 1200, GEO_LOCATIONS[3]);
  const wk10 = await createEmp("Senthil", "senthil@zerogroup.in", Role.WORKER, [CrewRole.HELPER, CrewRole.TROLLY_1_WHEEL], "9847333010", 1200, GEO_LOCATIONS[4]);
  const wk11 = await createEmp("Ravi", "ravi@zerogroup.in", Role.WORKER, [CrewRole.HELPER, CrewRole.PANI_HELPER], "9847333011", 1200, GEO_LOCATIONS[0]);
  const wk12 = await createEmp("Karuppan", "karuppan@zerogroup.in", Role.WORKER, [CrewRole.HELPER, CrewRole.TROLLY_2_WHEEL], "9847333012", 1200, GEO_LOCATIONS[1]);

  const driverPool    = [drv1, drv2, drv3];
  const leaderPool    = [op1, op2, op3, sharath];
  const mixerPool     = [op1, op2, op3, op4, op5, op6, op7, op8, op9, op10, op11, sharath, uttam];
  const hydraulicPool = [op4, op6, op7, op10];
  const liftPool      = [op1, op2, op3, sharath];
  const vibratorPool  = [op1, op2, op7, op11, sharath];
  const trollyPool    = [op3, op5, op8, op9, uttam, wk1, wk2, wk3, wk4, wk5, wk8, wk10];
  const workerPool    = [wk1, wk2, wk3, wk4, wk5, wk6, wk7, wk8, wk9, wk10, wk11, wk12];

  // ─── Machine Fleet: 6 Mixers, 5 Lifts, 6 Vibrators ─────────────────────────
  const mix1 = await prisma.machine.create({ data: { machineId: "MIX-001", type: MachineType.MIXER, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1200, fuelConsumptionThreshold: 2000, notes: "10/7 Diesel Standard Mixer" }});
  const mix2 = await prisma.machine.create({ data: { machineId: "MIX-002", type: MachineType.MIXER, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1200, fuelConsumptionThreshold: 2000, notes: "10/7 Diesel Standard Mixer" }});
  const mix3 = await prisma.machine.create({ data: { machineId: "MIX-003", type: MachineType.MIXER, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1300, fuelConsumptionThreshold: 2500, notes: "10/7 Hydraulic Heavy Hopper" }});
  const mix4 = await prisma.machine.create({ data: { machineId: "MIX-004", type: MachineType.MIXER, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1200, fuelConsumptionThreshold: 2000, notes: "10/7 Standard Diesel Mixer" }});
  const mix5 = await prisma.machine.create({ data: { machineId: "MIX-005", type: MachineType.MIXER, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1200, fuelConsumptionThreshold: 2000, notes: "10/7 Standard Mixer" }});
  const mix6 = await prisma.machine.create({ data: { machineId: "MIX-006", type: MachineType.MIXER, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1300, fuelConsumptionThreshold: 2500, notes: "10/7 Hydraulic Hopper" }});

  const lft1 = await prisma.machine.create({ data: { machineId: "LFT-001", type: MachineType.LIFT, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1500, fuelConsumptionThreshold: 1500, notes: "Heavy Duty Tower Winch Lift" }});
  const lft2 = await prisma.machine.create({ data: { machineId: "LFT-002", type: MachineType.LIFT, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1500, fuelConsumptionThreshold: 1500, notes: "Multifloor Builder Winch Lift" }});
  const lft3 = await prisma.machine.create({ data: { machineId: "LFT-003", type: MachineType.LIFT, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1500, fuelConsumptionThreshold: 1500, notes: "Builder Winch Lift #3" }});
  const lft4 = await prisma.machine.create({ data: { machineId: "LFT-004", type: MachineType.LIFT, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1500, fuelConsumptionThreshold: 1500, notes: "Builder Winch Lift #4" }});
  const lft5 = await prisma.machine.create({ data: { machineId: "LFT-005", type: MachineType.LIFT, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1500, fuelConsumptionThreshold: 1500, notes: "Builder Winch Lift #5" }});

  const vib1 = await prisma.machine.create({ data: { machineId: "VIB-001", type: MachineType.VIBRATOR, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1000, fuelConsumptionThreshold: 600, notes: "Robin Petrol Needle Vibrator" }});
  const vib2 = await prisma.machine.create({ data: { machineId: "VIB-002", type: MachineType.VIBRATOR, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1000, fuelConsumptionThreshold: 600, notes: "Honda Petrol Needle Vibrator" }});
  const vib3 = await prisma.machine.create({ data: { machineId: "VIB-003", type: MachineType.VIBRATOR, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1000, fuelConsumptionThreshold: 600, notes: "Greaves Petrol Needle Vibrator" }});
  const vib4 = await prisma.machine.create({ data: { machineId: "VIB-004", type: MachineType.VIBRATOR, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1000, fuelConsumptionThreshold: 600, notes: "Robin Petrol Needle Vibrator #4" }});
  const vib5 = await prisma.machine.create({ data: { machineId: "VIB-005", type: MachineType.VIBRATOR, status: MachineStatus.AVAILABLE, operatorDailyPayout: 800,  fuelConsumptionThreshold: 300, notes: "Electric Needle Vibrator (Single Phase)" }});
  const vib6 = await prisma.machine.create({ data: { machineId: "VIB-006", type: MachineType.VIBRATOR, status: MachineStatus.AVAILABLE, operatorDailyPayout: 800,  fuelConsumptionThreshold: 300, notes: "Electric Needle Vibrator (Three Phase)" }});

  const mixersPool    = [mix1, mix2, mix3, mix4, mix5, mix6];
  const liftsPool     = [lft1, lft2, lft3, lft4, lft5];
  const vibratorsPool = [vib1, vib2, vib3, vib4, vib5, vib6];

  // ─── Setup Tools (Trolleys, Sheets, Bench Pani, Needles, Spades) ────────────
  const toolDefs = [
    { toolId: "TL-001", name: "1-Wheel Trolly",                toolType: "TROLLY",  totalInventory: 16 },
    { toolId: "TL-002", name: "2-Wheel Trolly with Sheet",     toolType: "TROLLY",  totalInventory: 14 },
    { toolId: "TL-003", name: "Bench Pani Kit with Hose",      toolType: "PANI",    totalInventory: 12 },
    { toolId: "TL-004", name: "Tarp Sheet / Heavy Plastic",    toolType: "SHEET",   totalInventory: 20 },
    { toolId: "TL-005", name: "Needle Vibrator Pin (40mm/60mm)", toolType: "VIBRATOR", totalInventory: 12 },
    { toolId: "TL-006", name: "Construction Spade & Basin",    toolType: "GENERAL", totalInventory: 30 },
  ];
  const toolMap: Record<string, string> = {};
  for (const t of toolDefs) {
    const createdTool = await prisma.tool.create({ data: { ...t, status: ToolStatus.AVAILABLE } });
    toolMap[t.toolId] = createdTool.id;
  }

  // ─── Vehicles & Documents ──────────────────────────────────────────────────
  const veh1 = await prisma.vehicle.create({ data: { licensePlate: "KL-08-AB-1234", type: "Eicher 14ft Flatbed Truck", status: VehicleStatus.AVAILABLE } });
  const veh2 = await prisma.vehicle.create({ data: { licensePlate: "KL-08-CD-5678", type: "Tata 407 Heavy Hauler",     status: VehicleStatus.AVAILABLE } });
  const veh3 = await prisma.vehicle.create({ data: { licensePlate: "KL-08-EF-9012", type: "Mahindra Bolero Pickup",    status: VehicleStatus.AVAILABLE } });
  const vehiclePool = [veh1, veh2, veh3];

  for (const veh of vehiclePool) {
    await prisma.vehicleDocument.create({
      data: {
        vehicleId: veh.id,
        type: DocumentType.RC,
        documentNumber: `RC-${veh.licensePlate}`,
        issueDate: new Date("2023-05-10"),
        expiryDate: new Date("2028-05-10"),
        attachmentUrl: "/documents/sample-rc.pdf",
        status: DocumentStatus.ACTIVE,
      },
    });
    await prisma.vehicleDocument.create({
      data: {
        vehicleId: veh.id,
        type: DocumentType.INSURANCE,
        documentNumber: `INS-${veh.licensePlate}`,
        issueDate: new Date("2026-01-01"),
        expiryDate: new Date("2027-01-01"),
        attachmentUrl: "/documents/sample-insurance.pdf",
        status: DocumentStatus.ACTIVE,
      },
    });
  }

  // ─── Projects ─────────────────────────────────────────────────────────────
  const projectDefs = [
    { name: "Pala Highway Roadwork Phase 2", location: "Pala, Kottayam", startDate: new Date("2026-08-01") },
    { name: "Kanjirappally Central Complex", location: "Kanjirappally, Kerala", startDate: new Date("2026-08-15") },
    { name: "Kottayam Smart Road Infra", location: "Kottayam Central", startDate: new Date("2026-09-01") },
    { name: "St. Marys Convent Trust Expansion", location: "Erattupetta High Road", startDate: new Date("2026-09-10") },
    { name: "Skyline Residential Towers", location: "Pookoth Heights", startDate: new Date("2026-09-20") },
  ];
  const projects = [];
  for (const p of projectDefs) {
    const prj = await prisma.project.create({ data: { ...p, status: "ACTIVE" } });
    projects.push(prj);
  }

  // ─── Customers ────────────────────────────────────────────────────────────
  const customers = [];
  const customerNames = [
    "Kottayam Infra Developers", "Pala Heights Residency", "Thomson Builders & Promoters",
    "St. Mary's Convent Trust", "Skyline Commercial Towers", "Green Valley Villas",
    "Elias Abraham Contractors", "Kanjirappally Town Hall Project", "Royal Gardens Estates",
    "Pookoth Roadways & Paving",
  ];
  for (let i = 0; i < customerNames.length; i++) {
    const c = await prisma.customer.create({
      data: {
        name: customerNames[i],
        phone: `9847${(100000 + i).toString().slice(1)}`,
        address: `${LOCATIONS[i % LOCATIONS.length]}, Kerala`,
      },
    });
    customers.push(c);
  }

  console.log("  ✅ Roster, fleet, tools, projects, and documents seeded.\n");

  // ════════════════════════════════════════════════════════════════════
  // PHASE 3 — 28-DAY TIGHT SCHEDULE DISPATCHES & OPERATIONS
  // ════════════════════════════════════════════════════════════════════
  console.log("📋 Generating 28-day tight schedule (Sep 28 to Oct 26, 2026)...");

  const dates: Date[] = [];
  for (let d = new Date(SEED_START); d <= SEED_END; d = addDays(d, 1)) {
    dates.push(new Date(d));
  }

  let cntDispatch = 0;
  let cntAssign = 0;
  let cntTools = 0;
  let cntCash = 0;
  let cntExpenses = 0;
  let cntPings = 0;
  let cntPhotos = 0;
  let cntInvoices = 0;

  interface DispatchMeta {
    id: string;
    date: Date;
    status: DispatchStatus;
    siteLeaderId: string;
    crewIds: string[];
    toolIds: string[];
    customerCharge: number;
    primaryOpId?: string;
    customerId: string;
    location: string;
  }
  const dispatchMeta: DispatchMeta[] = [];

  for (let di = 0; di < dates.length; di++) {
    const date = dates[di];
    const diff = differenceInDays(date, TODAY); // < 0: Past, 0: Today, > 0: Future
    const isPast = diff < 0;
    const isToday = diff === 0;
    const weekend = isWeekend(date);

    // Guaranteed minimum 6 to 10 jobs daily
    const numJobs = weekend ? 6 : 8 + (di % 3);

    for (let ji = 0; ji < numJobs; ji++) {
      const customer = customers[(di * 7 + ji) % customers.length];
      const project = projects[(di * 3 + ji) % projects.length];
      const driver = det(driverPool, di + ji);
      const siteLeader = det(leaderPool, di + ji + 2);
      const location = LOCATIONS[(di * 4 + ji) % LOCATIONS.length];
      const geo = GEO_LOCATIONS[(di * 2 + ji) % GEO_LOCATIONS.length];
      const seed = di * 100 + ji;

      let status: DispatchStatus;
      let notes: string | null = null;

      if (isPast) {
        if (ji === 3 && (di % 4 === 0)) {
          status = DispatchStatus.CANCELLED;
          notes = "Job cancelled by client due to heavy rain and delayed concrete foundation preparation.";
        } else if (ji === 5 && (di % 6 === 0)) {
          status = DispatchStatus.CANCELLED;
          notes = "Customer postponed pour: cement truck delivery delay.";
        } else {
          status = DispatchStatus.COMPLETED;
          notes = "Slab pour completed successfully. Work logged, tools returned, and cash settled.";
        }
      } else if (isToday) {
        if (ji === 0 || ji === 1) {
          status = DispatchStatus.IN_PROGRESS;
          notes = "Ongoing pour: concrete mixer operational on site.";
        } else if (ji === 2 || ji === 3) {
          status = DispatchStatus.DELIVERED;
          notes = "Machinery delivered and handed over to site leader.";
        } else if (ji === 4 || ji === 5) {
          status = DispatchStatus.COMPLETED;
          notes = "Morning slab pour finished and signed off.";
        } else if (ji === 6) {
          status = DispatchStatus.CANCELLED;
          notes = "Site waterlogging caused postponement to tomorrow.";
        } else {
          status = DispatchStatus.PENDING;
          notes = "Scheduled for afternoon shift.";
        }
      } else {
        status = ji % 3 === 0 ? DispatchStatus.ACCEPTED : DispatchStatus.PENDING;
        notes = "Advance equipment booking confirmed.";
      }

      const isCancelled = status === DispatchStatus.CANCELLED;

      // Machinery combinations
      const jobTypePattern = (di + ji) % 6;
      let machineId: string | null = null;
      let liftId: string | null = null;
      let vibratorId: string | null = null;
      let mixerCategory: MixerCategory = MixerCategory.STANDARD;
      let vibratorType: VibratorType | null = null;
      let hasTrollyBench = true;
      let customerCharge = 6500;
      let opDailyRate = 1200;
      let plannedHelperCount = 6;
      let trollyWorkerCount = 2;
      let liftFloors = 0;

      const toolsToIssue: { toolId: string; qty: number; variant?: string }[] = [];
      const crew: { role: CrewRole; emp: EmpObj; wage: number }[] = [];
      const used = new Set<string>([driver.id, siteLeader.id]);

      const addLeaderToCrew = (role: CrewRole, wage = 1200) => {
        crew.push({ role, emp: siteLeader, wage });
      };

      const p = (empList: EmpObj[]) => pickUnused(empList, used, seed + crew.length * 13);
      const addCrewMember = (role: CrewRole, empList: EmpObj[], wage = 1200) => {
        const e = p(empList);
        if (e) {
          crew.push({ role, emp: e, wage });
          used.add(e.id);
        }
      };

      switch (jobTypePattern) {
        case 0: {
          const mix = det(mixersPool, di + ji);
          const vib = det(vibratorsPool, di + ji);
          machineId = mix.id;
          vibratorId = vib.id;
          vibratorType = VibratorType.PETROL;
          customerCharge = 8500;
          opDailyRate = 1200;
          plannedHelperCount = 8;
          trollyWorkerCount = 3;

          addLeaderToCrew(CrewRole.MIXER_OPERATOR, 1200);
          addCrewMember(CrewRole.P_VIBRATOR, vibratorPool, 1000);
          addCrewMember(CrewRole.TROLLY_1_WHEEL, trollyPool, 1200);
          addCrewMember(CrewRole.TROLLY_1_WHEEL, trollyPool, 1200);
          addCrewMember(CrewRole.HELPER, workerPool, 1200);
          addCrewMember(CrewRole.HELPER, workerPool, 1200);

          toolsToIssue.push(
            { toolId: "TL-001", qty: 3, variant: "1-Wheel Heavy Trolly" },
            { toolId: "TL-003", qty: 1, variant: "Bench Pani Kit" },
            { toolId: "TL-004", qty: 2, variant: "Ground Poly Sheet" },
            { toolId: "TL-005", qty: 2, variant: "60mm Needle" },
            { toolId: "TL-006", qty: 6, variant: "Basin + Spade" }
          );
          break;
        }
        case 1: {
          const mix = mix3; // Hydraulic
          const lft = det(liftsPool, di + ji);
          const vib = vib1;
          machineId = mix.id;
          liftId = lft.id;
          vibratorId = vib.id;
          mixerCategory = MixerCategory.HYDRAULIC;
          vibratorType = VibratorType.PETROL;
          liftFloors = 2;
          customerCharge = 12500;
          opDailyRate = 1500;
          plannedHelperCount = 10;
          trollyWorkerCount = 4;

          addLeaderToCrew(CrewRole.HYDRAULIC_OPERATOR, 1300);
          addCrewMember(CrewRole.LIFT_OPERATOR, liftPool, 1500);
          addCrewMember(CrewRole.P_VIBRATOR, vibratorPool, 1000);
          addCrewMember(CrewRole.TROLLY_2_WHEEL, trollyPool, 1200);
          addCrewMember(CrewRole.TROLLY_2_WHEEL, trollyPool, 1200);
          addCrewMember(CrewRole.HELPER, workerPool, 1200);
          addCrewMember(CrewRole.HELPER, workerPool, 1200);
          addCrewMember(CrewRole.HELPER, workerPool, 1200);

          toolsToIssue.push(
            { toolId: "TL-002", qty: 2, variant: "2-Wheel Trolly with Sheet" },
            { toolId: "TL-003", qty: 1, variant: "Bench Pani Setup" },
            { toolId: "TL-004", qty: 4, variant: "Roof Protection Sheet" },
            { toolId: "TL-005", qty: 2, variant: "40mm Needle" },
            { toolId: "TL-006", qty: 8, variant: "Standard Spades" }
          );
          break;
        }
        case 2: {
          const mix = det(mixersPool, di + ji + 1);
          machineId = mix.id;
          customerCharge = 6000;
          opDailyRate = 1200;
          plannedHelperCount = 6;
          trollyWorkerCount = 2;

          addLeaderToCrew(CrewRole.MIXER_OPERATOR, 1200);
          addCrewMember(CrewRole.TROLLY_1_WHEEL, trollyPool, 1200);
          addCrewMember(CrewRole.TROLLY_2_WHEEL, trollyPool, 1200);
          addCrewMember(CrewRole.HELPER, workerPool, 1200);
          addCrewMember(CrewRole.HELPER, workerPool, 1200);

          toolsToIssue.push(
            { toolId: "TL-001", qty: 2, variant: "1-Wheel Trolly" },
            { toolId: "TL-002", qty: 1, variant: "2-Wheel Trolly with Sheet" },
            { toolId: "TL-003", qty: 1, variant: "Bench Pani Kit" },
            { toolId: "TL-006", qty: 5, variant: "Spades" }
          );
          break;
        }
        case 3: {
          const mix = det(mixersPool, di + ji + 2);
          const vib = vib5; // Electric
          machineId = mix.id;
          vibratorId = vib.id;
          vibratorType = VibratorType.ELECTRIC;
          customerCharge = 7000;
          opDailyRate = 1200;
          plannedHelperCount = 6;
          trollyWorkerCount = 2;

          addLeaderToCrew(CrewRole.MIXER_OPERATOR, 1200);
          addCrewMember(CrewRole.TROLLY_1_WHEEL, trollyPool, 1200);
          addCrewMember(CrewRole.HELPER, workerPool, 1200);
          addCrewMember(CrewRole.HELPER, workerPool, 1200);

          toolsToIssue.push(
            { toolId: "TL-001", qty: 2, variant: "1-Wheel Trolly" },
            { toolId: "TL-003", qty: 1, variant: "Bench Pani Kit" },
            { toolId: "TL-004", qty: 2, variant: "Ground Sheet" },
            { toolId: "TL-005", qty: 2, variant: "Electric Needle 40mm" },
            { toolId: "TL-006", qty: 4, variant: "Spades" }
          );
          break;
        }
        case 4: {
          const lft = det(liftsPool, di + ji + 3);
          liftId = lft.id;
          liftFloors = 3;
          customerCharge = 3200;
          opDailyRate = 1500;
          plannedHelperCount = 4;
          trollyWorkerCount = 2;

          addLeaderToCrew(CrewRole.LIFT_OPERATOR, 1500);
          addCrewMember(CrewRole.TROLLY_2_WHEEL, trollyPool, 1200);
          addCrewMember(CrewRole.HELPER, workerPool, 1200);

          toolsToIssue.push(
            { toolId: "TL-002", qty: 2, variant: "2-Wheel Trolly with Sheet" },
            { toolId: "TL-004", qty: 2, variant: "Heavy Sheet" }
          );
          break;
        }
        case 5: {
          const mix = mix6; // Hydraulic
          const lft = lft3;
          const vib = vib2;
          machineId = mix.id;
          liftId = lft.id;
          vibratorId = vib.id;
          mixerCategory = MixerCategory.HYDRAULIC;
          vibratorType = VibratorType.PETROL;
          liftFloors = 1;
          customerCharge = 14000;
          opDailyRate = 1500;
          plannedHelperCount = 12;
          trollyWorkerCount = 4;

          addLeaderToCrew(CrewRole.HYDRAULIC_OPERATOR, 1300);
          addCrewMember(CrewRole.LIFT_OPERATOR, liftPool, 1500);
          addCrewMember(CrewRole.P_VIBRATOR, vibratorPool, 1000);
          addCrewMember(CrewRole.TROLLY_1_WHEEL, trollyPool, 1200);
          addCrewMember(CrewRole.TROLLY_1_WHEEL, trollyPool, 1200);
          addCrewMember(CrewRole.TROLLY_2_WHEEL, trollyPool, 1200);
          addCrewMember(CrewRole.HELPER, workerPool, 1200);
          addCrewMember(CrewRole.HELPER, workerPool, 1200);

          toolsToIssue.push(
            { toolId: "TL-001", qty: 2, variant: "1-Wheel Trolly" },
            { toolId: "TL-002", qty: 2, variant: "2-Wheel Trolly with Sheet" },
            { toolId: "TL-003", qty: 2, variant: "Bench Pani Kits" },
            { toolId: "TL-004", qty: 4, variant: "Thick Plastic Sheets" },
            { toolId: "TL-005", qty: 2, variant: "Needle 60mm" },
            { toolId: "TL-006", qty: 10, variant: "Spades & Pans" }
          );
          break;
        }
      }

      const primaryOpId = crew[0]?.emp.id;

      // Create DailyDispatch
      const dispatch = await prisma.dailyDispatch.create({
        data: {
          customerId:           customer.id,
          projectId:            project.id,
          machineId:            machineId ?? undefined,
          liftId:               liftId ?? undefined,
          vibratorId:           vibratorId ?? undefined,
          mixerCategory,
          vibratorType,
          hasTrollyBench,
          liftFloors,
          driverId:             driver.id,
          operatorId:           primaryOpId,
          siteLeaderEmployeeId: siteLeader.id,
          location,
          latitude:             new Prisma.Decimal(geo.lat),
          longitude:            new Prisma.Decimal(geo.lng),
          dateOfService:        date,
          status,
          workType:             WorkType.NORMAL,
          customerCharge:       isCancelled ? 0 : customerCharge,
          operatorDailyRate:    isCancelled ? 0 : opDailyRate,
          helperCount:          isCancelled ? 0 : plannedHelperCount,
          trollyWorkerCount:    isCancelled ? 0 : trollyWorkerCount,
          notes,
          isPrimaryBillingRow:  true,
          version:              1,
        },
      });
      cntDispatch++;

      // Dispatch Machine and Asset secondary records
      if (machineId) {
        await prisma.dispatchMachine.create({ data: { dispatchId: dispatch.id, machineId } });
        await prisma.dispatchAsset.create({ data: { dispatchId: dispatch.id, machineId } });
      }
      if (liftId) {
        await prisma.dispatchMachine.create({ data: { dispatchId: dispatch.id, machineId: liftId } });
      }

      // Dispatch Status History (Audit trail of status)
      await prisma.dispatchStatusHistory.create({
        data: {
          dispatchId:  dispatch.id,
          oldStatus:   DispatchStatus.PENDING,
          newStatus:   status,
          changedById: staff1.id,
          reason:      isCancelled ? "Weather/Client Delay" : "Scheduled Shift Assignment",
          createdAt:   date,
        },
      });

      // Dispatch Labor summary row
      await prisma.dispatchLabor.create({
        data: {
          dispatchId:         dispatch.id,
          internalEmployeeId: primaryOpId,
          headCount:          plannedHelperCount + 1,
          helperCount:        plannedHelperCount,
          lumpSumWage:        plannedHelperCount * 1200 + opDailyRate,
          actualWagePaid:     isCancelled ? 0 : plannedHelperCount * 1200 + opDailyRate,
          internalHeadCount:  plannedHelperCount,
          externalHeadCount:  0,
          outsideWagePaid:    isCancelled ? 0 : plannedHelperCount * 1200,
          notes:              "Direct worker labor crew @ flat ₹1,200",
        },
      });

      // Crew assignments
      for (const c of crew) {
        try {
          await prisma.dispatchAssignment.create({
            data: {
              dispatchId:     dispatch.id,
              employeeId:     c.emp.id,
              assignedRole:   c.role,
              lockedWageRate: c.wage,
              headcount:      1,
            },
          });
          cntAssign++;
        } catch {}
      }

      // Setup tools
      const savedToolIds: string[] = [];
      for (const t of toolsToIssue) {
        const dbToolId = toolMap[t.toolId];
        if (!dbToolId) continue;
        try {
          const dt = await prisma.dispatchTool.create({
            data: {
              dispatchId:   dispatch.id,
              toolId:       dbToolId,
              quantity:     t.qty,
              variant:      t.variant,
              returnStatus: isPast ? "RETURNED" : "PENDING",
            },
          });
          savedToolIds.push(dt.id);
          cntTools++;
        } catch {}
      }

      // Live Location Pings for active and recent jobs
      if (isToday || (diff >= -5 && diff < 0)) {
        for (let step = 0; step < 5; step++) {
          const pingLat = geo.lat + (step * 0.001);
          const pingLng = geo.lng + (step * 0.001);
          await prisma.locationPing.create({
            data: {
              employeeId: driver.id,
              dispatchId: dispatch.id,
              latitude:   new Prisma.Decimal(pingLat),
              longitude:  new Prisma.Decimal(pingLng),
              accuracy:   6.5,
              speed:      24.0,
              altitude:   15.0,
              source:     "CAPACITOR",
              timestamp:  new Date(date.getTime() + (7 + step) * 3600000),
            },
          });
          cntPings++;
        }
      }

      // Financials for completed jobs
      if ((isPast || (isToday && status === DispatchStatus.COMPLETED)) && !isCancelled && primaryOpId) {
        const isCash = ji % 2 === 0;

        await prisma.cashCollection.create({
          data: {
            operatorId:      primaryOpId,
            dispatchId:      dispatch.id,
            amountCollected: customerCharge,
            date,
            status:          "DEPOSITED",
            confirmedById:   staff1.id,
            confirmedAt:     addDays(date, 1),
            notes:           `Customer collection for ${customer.name} at ${location}`,
          },
        });
        cntCash++;

        await prisma.paymentReceipt.create({
          data: {
            receiptNumber:         `REC-${formatDateCode(date)}-${(cntCash + 1000).toString().slice(1)}`,
            customerId:            customer.id,
            dispatchId:            dispatch.id,
            amount:                customerCharge,
            paymentMethod:         isCash ? PaymentMethod.CASH : PaymentMethod.UPI,
            paymentDate:           date,
            depositStatus:         "DEPOSITED",
            collectedByEmployeeId: primaryOpId,
            notes:                 isCash ? "Paid in full via Cash on site" : "UPI payment received via GPay",
          },
        });

        // PaymentRecord
        await prisma.paymentRecord.create({
          data: {
            dispatchId:      dispatch.id,
            amount:          customerCharge,
            method:          isCash ? "CASH" : "UPI",
            collectedById:   primaryOpId,
            verifiedByStaff: true,
            createdAt:       date,
          },
        });

        // Machine Diesel Expense
        if (machineId) {
          const dieselCost = 2500 + ((di * 7 + ji * 13) % 2000);
          await prisma.expense.create({
            data: {
              loggerId:    staff1.id,
              amount:      dieselCost,
              category:    ExpenseCategory.DIESEL,
              description: `Diesel top-up for concrete mixer at ${location}`,
              date,
              machineId,
              dispatchId:  dispatch.id,
              notes:       "Bulk fuel barrel refilled at local pump",
            },
          });
          cntExpenses++;
        }

        // Direct Worker Wage Expense
        const workerWageOutlay = plannedHelperCount * 1200;
        await prisma.expense.create({
          data: {
            loggerId:    staff1.id,
            amount:      workerWageOutlay,
            category:    ExpenseCategory.OUTSIDE_HELPER_WAGE,
            description: `Daily wage payout for ${plannedHelperCount} direct workers @ ₹1,200/day`,
            date,
            dispatchId:  dispatch.id,
            notes:       `Flat basic rate ₹1,200/worker - verified site count ${plannedHelperCount}`,
          },
        });
        cntExpenses++;

        // Invoice & InvoiceItem
        if (ji % 3 === 0) {
          const invNumber = `INV-${formatDateCode(date)}-${(cntInvoices + 100).toString().slice(1)}`;
          const inv = await prisma.invoice.create({
            data: {
              invoiceNumber:   invNumber,
              customerId:      customer.id,
              totalAmount:     customerCharge,
              paidCash:        isCash ? customerCharge : 0,
              paidUpi:         !isCash ? customerCharge : 0,
              paymentMethod:   isCash ? PaymentMethod.CASH : PaymentMethod.UPI,
              paidAt:          date,
              status:          InvoiceStatus.PAID,
              issuedDate:      date,
              dueDate:         addDays(date, 7),
              siteLocation:    location,
              notes:           `Official invoice for concrete equipment rental at ${location}`,
            },
          });
          cntInvoices++;

          await prisma.invoiceItem.create({
            data: {
              invoiceId:     inv.id,
              itemKey:       "MIXER_RENTAL",
              description:   "Concrete Mixer 10/7 Standard Rental",
              quantity:      1,
              rate:          1000,
              total:         1000,
            },
          });
          await prisma.invoiceItem.create({
            data: {
              invoiceId:     inv.id,
              itemKey:       "LABOR_PANI",
              description:   `Direct worker crew (${plannedHelperCount} workers)`,
              quantity:      plannedHelperCount,
              rate:          1200,
              total:         plannedHelperCount * 1200,
            },
          });
        }
      }

      dispatchMeta.push({
        id:             dispatch.id,
        date,
        status,
        siteLeaderId:   siteLeader.id,
        crewIds:        crew.map(c => c.emp.id),
        toolIds:        savedToolIds,
        customerCharge,
        primaryOpId,
        customerId:     customer.id,
        location,
      });
    }
  }

  console.log(`\n  ✅ Dispatches: ${cntDispatch} | Invoices: ${cntInvoices} | GPS Pings: ${cntPings}\n`);

  // ════════════════════════════════════════════════════════════════════
  // PHASE 4 — SHIFT LOGS, VEHICLE FUEL & MAINTENANCE
  // ════════════════════════════════════════════════════════════════════
  console.log("🚚 Seeding Driver Shift Logs, Vehicle Fuel & Maintenance...");
  for (let di = 0; di <= 14; di++) {
    const logDate = dates[di];
    for (let i = 0; i < driverPool.length; i++) {
      const driver = driverPool[i];
      const vehicle = vehiclePool[i % vehiclePool.length];
      await prisma.shiftLog.create({
        data: {
          driverId:  driver.id,
          vehicleId: vehicle.id,
          date:      logDate,
          startTime: new Date(logDate.getTime() + 6.5 * 3600000),
          endTime:   new Date(logDate.getTime() + 18.5 * 3600000),
        },
      });

      if (di % 3 === 0) {
        const fuelCost = 3500 + (i * 400);
        await prisma.fuelLog.create({
          data: {
            vehicleId:       vehicle.id,
            driverId:        driver.id,
            liters:          35,
            totalCost:       fuelCost,
            odometerReading: 45000 + (di * 120),
            receiptUrl:      "/receipts/sample-diesel-receipt.png",
            date:            logDate,
          },
        });

        await prisma.expense.create({
          data: {
            loggerId:    staff1.id,
            amount:      fuelCost,
            category:    ExpenseCategory.DIESEL,
            description: `Vehicle diesel for ${vehicle.licensePlate}`,
            date:        logDate,
            vehicleId:   vehicle.id,
          },
        });
        cntExpenses++;
      }
    }
  }

  await prisma.maintenanceTicket.createMany({
    data: [
      { machineId: mix2.id, issueDescription: "Drum roller bearing replacement", mechanicName: "Abdul Workshop", partsCost: 2400, laborCost: 800, status: "RESOLVED", resolvedAt: new Date("2026-10-04") },
      { machineId: vib3.id, issueDescription: "Needle spring coupling damaged",  mechanicName: "Kottayam Power Tools", partsCost: 1500, laborCost: 500, status: "RESOLVED", resolvedAt: new Date("2026-10-08") },
      { machineId: lft2.id, issueDescription: "Winch wire tensioner adjustment", mechanicName: "Precision Mechanics", partsCost: 800,  laborCost: 400, status: "RESOLVED", resolvedAt: new Date("2026-10-10") },
    ],
  });

  // ════════════════════════════════════════════════════════════════════
  // PHASE 5 — FIELD DIARIES, ATTENDANCE, PHOTOS & EXTERNAL LABOR
  // ════════════════════════════════════════════════════════════════════
  console.log("📝 Seeding Field Diary Logs, Attendance, Photos & Tool Checks...");
  const recentDispatches = dispatchMeta.filter(d => {
    const diff = differenceInDays(TODAY, d.date);
    return diff >= 0 && diff <= 5 &&
           (d.status === DispatchStatus.COMPLETED || d.status === DispatchStatus.IN_PROGRESS);
  });

  let cntDiary = 0;
  for (const dd of recentDispatches) {
    const isCompleted = dd.status === DispatchStatus.COMPLETED;
    try {
      const diary = await prisma.fieldDiaryLog.create({
        data: {
          dispatchId:          dd.id,
          loggedByLeaderId:    dd.siteLeaderId,
          date:                dd.date,
          siteStatus:          isCompleted ? "COMPLETED" : "IN_PROGRESS",
          arrivalTime:         new Date(dd.date.getTime() + 7 * 3600000),
          departureTime:       isCompleted ? new Date(dd.date.getTime() + 17.5 * 3600000) : null,
          internalHelperCount: dd.crewIds.length,
          notes:               isCompleted ? "Pour executed smoothly. Setup tools returned in good condition." : "Active site pour in progress.",
          isSubmitted:         isCompleted,
          submittedAt:         isCompleted ? new Date(dd.date.getTime() + 18 * 3600000) : null,
        },
      });
      cntDiary++;

      // Dispatch Photos
      await prisma.dispatchPhoto.create({
        data: {
          dispatchId:      dd.id,
          fieldDiaryLogId: diary.id,
          uploadedById:    dd.siteLeaderId,
          photoUrl:        "/photos/sample-slab-pour.jpg",
          caption:         `Slab pour execution at ${dd.location}`,
          uploadedAt:      new Date(dd.date.getTime() + 10 * 3600000),
        },
      });
      cntPhotos++;

      // External Labor Log
      await prisma.externalLaborLog.create({
        data: {
          fieldDiaryLogId: diary.id,
          subLeaderName:   "Local Site Support",
          workerCount:     2,
          cashPaid:        2400,
          notes:           "2 Extra helpers for finishing trowel work",
        },
      });

      for (const empId of dd.crewIds) {
        try {
          await prisma.attendanceLog.create({
            data: {
              fieldDiaryLogId: diary.id,
              employeeId:      empId,
              isPresent:       true,
              markedAt:        new Date(dd.date.getTime() + 7.2 * 3600000),
            },
          });
        } catch {}
      }

      if (isCompleted) {
        for (const dtId of dd.toolIds) {
          try {
            await prisma.equipmentVerificationLog.create({
              data: {
                fieldDiaryLogId: diary.id,
                dispatchToolId:  dtId,
                isReturned:      true,
                condition:       "OK",
                notes:           "Tool inspected and cleaned.",
              },
            });
          } catch {}
        }
      }
    } catch {}
  }

  // Site Labor Disbursement template
  const sampleDispatch = dispatchMeta[0];
  if (sampleDispatch && sampleDispatch.primaryOpId) {
    await prisma.siteLaborDisbursement.create({
      data: {
        dispatchId:          sampleDispatch.id,
        internalOperatorId:  sampleDispatch.primaryOpId,
        subLeaderId:         subLeader1.id,
        date:                sampleDispatch.date,
        totalCashHandedOut:  2400,
        externalWorkerNames: "Babu, Shaji",
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════
  // PHASE 6 — ADJUSTMENTS, ADVANCES, SETTLEMENTS & AUDIT LOGS
  // ════════════════════════════════════════════════════════════════════
  console.log("💰 Seeding Adjustments, Advances, Settlements & Audit Logs...");

  // Manual Adjustments (Bonuses & Overtime)
  const adjList = [
    { empId: op1.id,  amt: 500, type: AdjustmentType.BONUS, reason: "Excellent maintenance of Mixer 001", date: new Date("2026-10-03") },
    { empId: drv1.id, amt: 400, type: AdjustmentType.BONUS, reason: "Sunday emergency delivery coverage",  date: new Date("2026-10-05") },
    { empId: op4.id,  amt: 500, type: AdjustmentType.BONUS, reason: "Overtime hydraulic mixer run",         date: new Date("2026-10-08") },
  ];
  for (const a of adjList) {
    await prisma.manualAdjustment.create({
      data: {
        employeeId:       a.empId,
        amount:           a.amt,
        type:             a.type,
        reason:           a.reason,
        date:             a.date,
        status:           "APPROVED",
        settlementStatus: "SETTLED",
        createdById:      staff1.id,
        approvedById:     owner.id,
        approvedAt:       a.date,
        approvalStatus:   "APPROVED",
      },
    });
  }

  // Mid-week salary advances
  const advances = [
    { empId: op1.id,  amount: 2000, date: new Date("2026-10-02"), notes: "Family festival advance" },
    { empId: drv1.id, amount: 1500, date: new Date("2026-10-04"), notes: "Vehicle permit emergency advance" },
    { empId: op4.id,  amount: 2500, date: new Date("2026-10-07"), notes: "Mid-month advance request" },
    { empId: drv2.id, amount: 1000, date: new Date("2026-10-08"), notes: "Conveyance advance" },
    { empId: op2.id,  amount: 1500, date: new Date("2026-10-10"), notes: "Personal advance" },
  ];
  for (const adv of advances) {
    await prisma.salaryAdvance.create({
      data: {
        employeeId: adv.empId,
        amount:     adv.amount,
        date:       adv.date,
        status:     adv.date <= new Date("2026-10-10") ? "SETTLED" : "PENDING",
        notes:      adv.notes,
      },
    });

    await prisma.expense.create({
      data: {
        loggerId:    staff1.id,
        amount:      adv.amount,
        category:    ExpenseCategory.STAFF_ADVANCE,
        description: `Salary Advance: ₹${adv.amount} to staff`,
        date:        adv.date,
        employeeId:  adv.empId,
        notes:       adv.notes,
      },
    });
  }

  // Weekly Settlements
  const weeklyPayrollEmployees = [
    staff1,
    drv1, drv2, drv3,
    op1, op2, op3, op4, op5, op6, op7, op8, op9, op10, op11, sharath, uttam,
  ];
  const pastSaturdays = [
    { start: new Date("2026-09-28"), end: new Date("2026-10-03"), weekEnding: new Date("2026-10-03") },
    { start: new Date("2026-10-04"), end: new Date("2026-10-10"), weekEnding: new Date("2026-10-10") },
  ];

  for (const week of pastSaturdays) {
    for (const emp of weeklyPayrollEmployees) {
      const weeklyAssignments = await prisma.dispatchAssignment.findMany({
        where: {
          employeeId: emp.id,
          settlementId: null,
          dispatch: {
            dateOfService: { gte: week.start, lte: week.end },
            status: DispatchStatus.COMPLETED,
          },
        },
      });

      const earnedFromAssignments = weeklyAssignments.reduce(
        (sum, a) => sum + Number(a.lockedWageRate) * (a.headcount || 1),
        0
      );

      const isStaff = emp.id === staff1.id;
      const basePay = isStaff ? 6000 : (emp.id === drv1.id || emp.id === drv2.id || emp.id === drv3.id ? 5400 : 7200);
      const grossEarned = earnedFromAssignments > 0 ? earnedFromAssignments : basePay;

      const empAdvances = await prisma.salaryAdvance.findMany({
        where: {
          employeeId: emp.id,
          date: { gte: week.start, lte: week.end },
        },
      });
      const advanceDeducted = empAdvances.reduce((sum, a) => sum + Number(a.amount), 0);
      const finalPaid = Math.max(0, grossEarned - advanceDeducted);

      const settlement = await prisma.settlement.create({
        data: {
          employeeId:  emp.id,
          weekEnding:  week.weekEnding,
          finalPayout: grossEarned,
          amountPaid:  finalPaid,
          status:      SettlementStatus.FINALIZED,
          notes:       `Weekly Payroll Paid in Full up to Saturday ${week.weekEnding.toISOString().split("T")[0]}. Advances adjusted: ₹${advanceDeducted}. Net Paid: ₹${finalPaid}.`,
        },
      });

      if (weeklyAssignments.length > 0) {
        await prisma.dispatchAssignment.updateMany({
          where: { id: { in: weeklyAssignments.map(a => a.id) } },
          data: { settlementId: settlement.id },
        });
      }
    }
  }

  // ─── Chat Messages ────────────────────────────────────────────────────────
  const chatMessages = [
    { senderId: staff1.id, text: "Good morning team. Mixer 001 & Lift 002 dispatched to Kanjirappally site.", createdAt: new Date("2026-10-12T07:00:00Z") },
    { senderId: drv1.id,   text: "Delivered to site. Rajesh Bhai has taken over operation.", createdAt: new Date("2026-10-12T07:45:00Z") },
    { senderId: op1.id,    text: "Slab pour started. 8 direct workers on site with 2 trolleys and bench pani.", createdAt: new Date("2026-10-12T08:30:00Z") },
    { senderId: staff1.id, text: "Customer Thomson Builders paid ₹8,500 via GPay. Verified.", createdAt: new Date("2026-10-12T11:00:00Z") },
    { senderId: owner.id,  text: "Approved fuel reimbursement for truck KL-08-AB-1234.", createdAt: new Date("2026-10-12T12:00:00Z") },
  ];
  for (const cm of chatMessages) {
    await prisma.chatMessage.create({ data: cm });
  }

  // ─── Audit Logs ───────────────────────────────────────────────────────────
  const auditEntries = [
    { actorId: owner.id,  actionType: "LOGIN", actorRole: Role.OWNER, entity: "AUTH", timestamp: new Date("2026-10-12T06:00:00Z") },
    { actorId: staff1.id, actionType: "CREATE_DISPATCH", actorRole: Role.STAFF, entity: "DAILY_DISPATCH", timestamp: new Date("2026-10-12T06:30:00Z") },
    { actorId: staff1.id, actionType: "SETTLEMENT_LOCK", actorRole: Role.STAFF, entity: "SETTLEMENT", timestamp: new Date("2026-10-10T19:00:00Z") },
    { actorId: owner.id,  actionType: "APPROVE_BONUS", actorRole: Role.OWNER, entity: "MANUAL_ADJUSTMENT", timestamp: new Date("2026-10-08T18:00:00Z") },
  ];
  for (const ae of auditEntries) {
    await prisma.auditLog.create({ data: ae });
  }

  console.log("═".repeat(70));
  console.log("🎉 IronRent 100% Full-Coverage Database Seeding COMPLETED!");
  console.log("═".repeat(70));
}

main()
  .catch(e => {
    console.error("❌ Seed failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
