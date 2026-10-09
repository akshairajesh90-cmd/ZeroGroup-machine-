/**
 * IronRent ERP — Self-Contained Heavy Seed Dataset v3.0
 * Date range : Aug 1 – Sep 5, 2026
 * Jobs/day   : 8–12 with realistic scenario mix
 *
 * UNIFIED SCRIPT:
 * - Drops all existing data cleanly.
 * - Seeds User, Employee (with capableRoles), Customer, Machine, Vehicle, Tool.
 * - Generates 350+ dispatches, crew assignments, diary logs, verifications, pings.
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient, Role, MachineStatus, DispatchStatus, MachineType, VehicleStatus,
  WorkType, CrewRole, ToolStatus, SettlementStatus,
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

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const TODAY      = startOfDay(new Date("2026-08-29"));
const SEED_START = new Date("2026-08-01");
const SEED_END   = new Date("2026-09-05");

const WAGE: Record<CrewRole, number> = {
  MIXER_OPERATOR:    1200,
  HYDRAULIC_OPERATOR: 1300,
  VIBRATOR_OPERATOR: 1000,
  LIFT_OPERATOR:     1500,
  WORKER_LEADER:      900,
  HELPER:             500,
  DRIVER:             800,
  SUB_LEADER:        1000,
  PANI_HELPER:        450,
  TROLLY_1_WHEEL:     600,
  TROLLY_2_WHEEL:     700,
  P_VIBRATOR:         900,
};

const LOCATIONS = [
  "Nadakkal", "Mathamangalam", "Kunnoni", "Vadakkan Site", "Pookoth",
  "Kanjirappally", "Unichamara", "Noble Site", "Odayakkal", "Konippada",
  "Jose Mestri Site", "Ullanpara", "Nellikunnu", "Industrial Area", "City Center",
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
type EmpObj = { id: string; name: string };

function det<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

function pickUnused(pool: EmpObj[], used: Set<string>, seed: number): EmpObj | null {
  const avail = pool.filter(e => !used.has(e.id));
  if (!avail.length) return null;
  return avail[Math.abs(seed) % avail.length];
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 IronRent Unified Heavy Seed v3.0 — Starting...\n");

  // ════════════════════════════════════════════════════════════════════
  // PHASE 0 — CLEAR DB
  // ════════════════════════════════════════════════════════════════════
  console.log("🗑️  Clearing entire database...");
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
  await prisma.cashCollection.deleteMany({});
  await prisma.siteLaborDisbursement.deleteMany({});
  await prisma.salaryAdvance.deleteMany({});
  await prisma.manualAdjustment.deleteMany({});
  await prisma.settlement.deleteMany({});
  await prisma.maintenanceTicket.deleteMany({});
  await prisma.dailyDispatch.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.tool.deleteMany({});
  await prisma.machine.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.user.deleteMany({});
  console.log("  ✅ Cleared.\n");

  // ════════════════════════════════════════════════════════════════════
  // PHASE 1 — SEED BASE ROSTER & ASSETS
  // ════════════════════════════════════════════════════════════════════
  console.log("👥 Seeding Users, Employees, Machines, Tools, Customers...");
  
  const HASH = bcrypt.hashSync("password123", 10);
  const ADMIN_HASH = bcrypt.hashSync("admin123", 10);

  async function createEmp(name: string, email: string, role: Role, capableRoles: CrewRole[]) {
    const u = await prisma.user.create({
      data: { email, hashedPassword: role === Role.OWNER ? ADMIN_HASH : HASH, role }
    });
    const e = await prisma.employee.create({
      data: { name, role, userId: u.id, capableRoles }
    });
    return { id: e.id, name: e.name };
  }

  const owner   = await createEmp("Akshai Rajesh", "akshairajesh07@gmail.com", Role.OWNER, []);
  const staff1  = await createEmp("Priya Menon", "priya@zerogroup.in", Role.STAFF, []);
  const drv1    = await createEmp("Suresh Kumar", "suresh@zerogroup.in", Role.DRIVER, [CrewRole.DRIVER]);
  const drv2    = await createEmp("Babu Antony", "babu@zerogroup.in", Role.DRIVER, [CrewRole.DRIVER]);
  const drv3    = await createEmp("Rajan Pillai", "rajan@zerogroup.in", Role.DRIVER, [CrewRole.DRIVER]);

  const op1     = await createEmp("Rajesh bhai", "rajesh@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.LIFT_OPERATOR, CrewRole.VIBRATOR_OPERATOR, CrewRole.P_VIBRATOR, CrewRole.HELPER]);
  const op2     = await createEmp("Subil Kumar", "subil@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.LIFT_OPERATOR, CrewRole.VIBRATOR_OPERATOR, CrewRole.P_VIBRATOR, CrewRole.HELPER]);
  const op3     = await createEmp("Pokkan", "pokkan@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.LIFT_OPERATOR, CrewRole.TROLLY_1_WHEEL, CrewRole.TROLLY_2_WHEEL, CrewRole.VIBRATOR_OPERATOR, CrewRole.P_VIBRATOR, CrewRole.HELPER]);
  const op4     = await createEmp("Tapan", "tapan@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.HYDRAULIC_OPERATOR, CrewRole.TROLLY_1_WHEEL, CrewRole.TROLLY_2_WHEEL, CrewRole.VIBRATOR_OPERATOR, CrewRole.P_VIBRATOR, CrewRole.HELPER]);
  const op5     = await createEmp("Pulkith", "pulkith@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.TROLLY_1_WHEEL, CrewRole.TROLLY_2_WHEEL, CrewRole.VIBRATOR_OPERATOR, CrewRole.P_VIBRATOR, CrewRole.HELPER]);
  const op6     = await createEmp("Sanjay", "sanjay@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.HYDRAULIC_OPERATOR, CrewRole.TROLLY_1_WHEEL, CrewRole.TROLLY_2_WHEEL, CrewRole.VIBRATOR_OPERATOR, CrewRole.P_VIBRATOR, CrewRole.HELPER]);
  const op7     = await createEmp("Kailas", "kailas@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.HYDRAULIC_OPERATOR, CrewRole.VIBRATOR_OPERATOR, CrewRole.P_VIBRATOR, CrewRole.HELPER]);
  const op8     = await createEmp("Tuna", "tuna@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.TROLLY_1_WHEEL, CrewRole.TROLLY_2_WHEEL, CrewRole.VIBRATOR_OPERATOR, CrewRole.P_VIBRATOR, CrewRole.HELPER]);
  const op9     = await createEmp("Mutta", "mutta@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.TROLLY_1_WHEEL, CrewRole.TROLLY_2_WHEEL, CrewRole.VIBRATOR_OPERATOR, CrewRole.P_VIBRATOR, CrewRole.HELPER]);
  const op10    = await createEmp("Amith", "amith@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.HYDRAULIC_OPERATOR, CrewRole.VIBRATOR_OPERATOR, CrewRole.P_VIBRATOR, CrewRole.HELPER]);
  const op11    = await createEmp("Vijay", "vijay@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.VIBRATOR_OPERATOR, CrewRole.P_VIBRATOR, CrewRole.HELPER]);
  const sharath = await createEmp("Sharath", "sharath@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.LIFT_OPERATOR, CrewRole.VIBRATOR_OPERATOR, CrewRole.P_VIBRATOR, CrewRole.HELPER]);
  const uttam   = await createEmp("Uttam", "uttam@zerogroup.in", Role.OPERATOR, [CrewRole.MIXER_OPERATOR, CrewRole.TROLLY_1_WHEEL, CrewRole.TROLLY_2_WHEEL, CrewRole.VIBRATOR_OPERATOR, CrewRole.P_VIBRATOR, CrewRole.HELPER]);
  const wk1     = await createEmp("Jose Mestri", "jose@zerogroup.in", Role.WORKER, [CrewRole.HELPER, CrewRole.SUB_LEADER, CrewRole.WORKER_LEADER]);
  const wk2     = await createEmp("Biju", "biju@zerogroup.in", Role.WORKER, [CrewRole.HELPER, CrewRole.PANI_HELPER]);
  const wk3     = await createEmp("Shibu", "shibu@zerogroup.in", Role.WORKER, [CrewRole.HELPER, CrewRole.PANI_HELPER]);

  const liftPool      = [op1, op2, op3, sharath];
  const hydraulicPool = [op4, op6, op7, op10];
  const trollyPool    = [op3, op4, op5, op6, op8, op9, uttam];
  const mixerPool     = [op1, op2, op3, op4, op5, op6, op7, op8, op9, op10, op11, sharath, uttam];
  const vibratorPool  = [op1, op2, op3, op4, op5, op6, op7, op8, op9, op10, sharath, uttam];
  const helperPool    = [wk1, wk2, wk3];
  const driverPool    = [drv1, drv2, drv3];
  const leaderPool    = [op1, op2, op3];

  // ─── Machines ─────────────────────────────────────────────────────
  const mix1 = await prisma.machine.create({ data: { machineId: "MIX-001", type: MachineType.MIXER, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1200, fuelConsumptionThreshold: 2000 }});
  const mix2 = await prisma.machine.create({ data: { machineId: "MIX-002", type: MachineType.MIXER, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1200, fuelConsumptionThreshold: 2000 }});
  const mix3 = await prisma.machine.create({ data: { machineId: "MIX-003", type: MachineType.MIXER, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1500, fuelConsumptionThreshold: 2500 }});
  const lft1 = await prisma.machine.create({ data: { machineId: "LFT-001", type: MachineType.LIFT, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1500, fuelConsumptionThreshold: 1500 }});
  const lft2 = await prisma.machine.create({ data: { machineId: "LFT-002", type: MachineType.LIFT, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1500, fuelConsumptionThreshold: 1500 }});
  const vib1 = await prisma.machine.create({ data: { machineId: "VIB-001", type: MachineType.VIBRATOR, status: MachineStatus.AVAILABLE, operatorDailyPayout: 1000, fuelConsumptionThreshold: 500 }});
  const vib2 = await prisma.machine.create({ data: { machineId: "VIB-002", type: MachineType.VIBRATOR, status: MachineStatus.AVAILABLE, operatorDailyPayout: 800, fuelConsumptionThreshold: 400 }});
  const pan1 = await prisma.machine.create({ data: { machineId: "PAN-001", type: MachineType.PANI, status: MachineStatus.AVAILABLE, operatorDailyPayout: 900, fuelConsumptionThreshold: 800 }});

  // ─── Tools ────────────────────────────────────────────────────────
  const toolDefs = [
    { toolId: "TL-001", name: "Concrete Mixer (Manual)",  toolType: "MIXER",   totalInventory: 5  },
    { toolId: "TL-002", name: "Vibrator Motor",           toolType: "VIBRATOR", totalInventory: 4  },
    { toolId: "TL-003", name: "Trolly (1 Wheel)",         toolType: "TROLLY",  totalInventory: 8  },
    { toolId: "TL-004", name: "Trolly (2 Wheel)",         toolType: "TROLLY",  totalInventory: 6  },
    { toolId: "TL-005", name: "Spade",                    toolType: "GENERAL", totalInventory: 20 },
    { toolId: "TL-006", name: "Water Pump Hose",          toolType: "PANI",    totalInventory: 4  },
  ];
  const toolMap: Record<string, string> = {};
  for (const t of toolDefs) {
    const tool = await prisma.tool.create({ data: { ...t, status: ToolStatus.AVAILABLE } });
    toolMap[t.toolId] = tool.id;
  }

  // ─── Customers ────────────────────────────────────────────────────
  const customers = [];
  for (let i = 1; i <= 5; i++) {
    const c = await prisma.customer.create({ data: { name: `Customer ${i}`, phone: `987654321${i}`, address: `Location ${i}` } });
    customers.push(c);
  }

  // ─── Vehicles ─────────────────────────────────────────────────────
  await prisma.vehicle.create({ data: { licensePlate: "KL-08-AB-1234", type: "TRUCK", status: VehicleStatus.AVAILABLE } });

  console.log("  ✅ Master Roster, Assets, and Tools seeded.\n");

  // ════════════════════════════════════════════════════════════════════
  // PHASE 2 — GENERATE DISPATCHES
  // ════════════════════════════════════════════════════════════════════
  console.log("📋 Generating dispatches Aug 1 – Sep 5...");

  let cntDispatch = 0, cntAssign = 0, cntTools = 0, cntCash = 0;
  
  interface DispatchMeta {
    id: string; date: Date; status: DispatchStatus;
    siteLeaderId: string; crewIds: string[];
    toolIds: string[]; // DispatchTool.id values
  }
  const dispatchMeta: DispatchMeta[] = [];

  let mix2Broken = false;
  let vib1Broken = false;

  const dates: Date[] = [];
  for (let d = new Date(SEED_START); d <= SEED_END; d = addDays(d, 1)) dates.push(new Date(d));

  for (let di = 0; di < dates.length; di++) {
    const date = dates[di];
    const dom  = date.getDate();
    const mon  = date.getMonth();
    const isToday  = di === 28; // August 29
    const isPast   = di < 28;
    const weekend  = isWeekend(date);

    if (dom === 3  && mon === 7) mix2Broken = true;
    if (dom === 7  && mon === 7) mix2Broken = false;
    if (dom === 15 && mon === 7) vib1Broken = true;
    if (dom === 22 && mon === 7) vib1Broken = false;

    const numJobs = isToday ? 8 : weekend ? 5 : dom % 3 === 0 ? 12 : dom % 2 === 0 ? 10 : 8;
    const scenarioOrder = ["A","B","C","D","E","F","G","H","I","J"] as const;

    for (let ji = 0; ji < numJobs; ji++) {
      const scenario = scenarioOrder[(ji + di) % 10];
      const customer = customers[(di * 7 + ji) % customers.length];
      const driver = det(driverPool, di + ji);
      const siteLeader = det(leaderPool, di + ji + 3);
      const location = LOCATIONS[(di * 5 + ji) % LOCATIONS.length];
      const seed = di * 100 + ji;

      let status: DispatchStatus;
      if (di > 28) {
        status = DispatchStatus.PENDING;
      } else if (isToday) {
        status = ji < 3 ? DispatchStatus.IN_PROGRESS :
                 ji < 7 ? DispatchStatus.COMPLETED   : DispatchStatus.PENDING;
      } else {
        const cancelDays = [3, 6, 10, 14, 18, 21, 25];
        status = (cancelDays.includes(dom) && ji === 2)
          ? DispatchStatus.CANCELLED : DispatchStatus.COMPLETED;
      }

      const used = new Set<string>([driver.id, siteLeader.id]);
      const crew: { role: CrewRole; emp: EmpObj }[] = [];

      let machineId:  string | null = null;
      let vibratorId: string | null = null;
      let liftId:     string | null = null;
      let charge      = 5000;
      let opDailyRate = 1200;
      let helperCount = 4;
      const tools: { toolId: string; qty: number }[] = [];

      const addLeaderToCrew = (role: CrewRole) => {
        crew.push({ role, emp: siteLeader });
      };

      const p = (pool: EmpObj[]) => pickUnused(pool, used, seed + crew.length * 17);
      const add = (role: CrewRole, pool: EmpObj[]) => {
        const e = p(pool);
        if (e) { crew.push({ role, emp: e }); used.add(e.id); }
      };

      switch (scenario) {
        case "A": { 
          machineId = mix2Broken ? mix1.id : (ji % 2 === 0 ? mix1.id : mix2.id);
          charge = 5000 + (ji % 4) * 500; opDailyRate = 1200; helperCount = 4 + (ji % 2);
          addLeaderToCrew(CrewRole.MIXER_OPERATOR);
          add(CrewRole.TROLLY_1_WHEEL, trollyPool);
          add(CrewRole.TROLLY_2_WHEEL, trollyPool);
          add(CrewRole.HELPER, [...helperPool, ...mixerPool]);
          tools.push({ toolId:"TL-003",qty:2 },{ toolId:"TL-004",qty:1 },{ toolId:"TL-005",qty:4 });
          break;
        }
        case "B": { 
          machineId = mix2Broken ? mix1.id : mix2.id;
          vibratorId = vib1Broken ? vib2.id : vib1.id;
          charge = 6500 + (ji % 3) * 500; opDailyRate = 1200; helperCount = 6;
          addLeaderToCrew(CrewRole.MIXER_OPERATOR);
          add(CrewRole.P_VIBRATOR, vibratorPool);
          add(CrewRole.TROLLY_1_WHEEL, trollyPool);
          add(CrewRole.HELPER, [...helperPool, ...mixerPool]);
          add(CrewRole.HELPER, [...helperPool, ...mixerPool]);
          tools.push({ toolId:"TL-002",qty:1 },{ toolId:"TL-003",qty:2 },{ toolId:"TL-005",qty:3 });
          break;
        }
        case "C": { 
          machineId = mix3.id;
          charge = 7500 + (ji % 3) * 500; opDailyRate = 1300; helperCount = 5;
          const hOp = p(hydraulicPool);
          if (hOp) { crew.push({ role: CrewRole.HYDRAULIC_OPERATOR, emp: hOp }); used.add(hOp.id); }
          add(CrewRole.TROLLY_1_WHEEL, trollyPool);
          add(CrewRole.TROLLY_2_WHEEL, trollyPool);
          add(CrewRole.HELPER, [...helperPool, ...mixerPool]);
          tools.push({ toolId:"TL-003",qty:2 },{ toolId:"TL-004",qty:1 },{ toolId:"TL-005",qty:4 });
          break;
        }
        case "D": { 
          liftId = ji % 2 === 0 ? lft1.id : lft2.id;
          charge = 4500 + (ji % 3) * 500; opDailyRate = 1500; helperCount = 3;
          const lOp = p(liftPool);
          if (lOp) { crew.push({ role: CrewRole.LIFT_OPERATOR, emp: lOp }); used.add(lOp.id); }
          add(CrewRole.TROLLY_2_WHEEL, trollyPool);
          add(CrewRole.HELPER, [...helperPool, ...mixerPool]);
          tools.push({ toolId:"TL-004",qty:2 },{ toolId:"TL-005",qty:2 });
          break;
        }
        case "E": { 
          machineId = mix1.id; liftId = lft1.id;
          charge = 9000 + (ji % 3) * 500; opDailyRate = 1500; helperCount = 8;
          const lOp = p(liftPool);
          if (lOp) { crew.push({ role: CrewRole.LIFT_OPERATOR, emp: lOp }); used.add(lOp.id); }
          addLeaderToCrew(CrewRole.MIXER_OPERATOR);
          add(CrewRole.TROLLY_1_WHEEL, trollyPool);
          add(CrewRole.TROLLY_2_WHEEL, trollyPool);
          add(CrewRole.HELPER, [...helperPool, ...mixerPool]);
          add(CrewRole.HELPER, [...helperPool, ...mixerPool]);
          tools.push({ toolId:"TL-003",qty:2 },{ toolId:"TL-004",qty:2 },{ toolId:"TL-005",qty:5 });
          break;
        }
        case "F": { 
          machineId = pan1.id;
          charge = 3500 + (ji % 3) * 300; opDailyRate = 900; helperCount = 3;
          addLeaderToCrew(CrewRole.MIXER_OPERATOR);
          add(CrewRole.PANI_HELPER, [wk2, wk3]);
          add(CrewRole.HELPER, [...helperPool, ...mixerPool]);
          tools.push({ toolId:"TL-006",qty:1 },{ toolId:"TL-005",qty:2 });
          break;
        }
        case "G": { 
          machineId = mix1.id;
          charge = 11000 + (ji % 3) * 1000; opDailyRate = 1200; helperCount = 10;
          addLeaderToCrew(CrewRole.MIXER_OPERATOR);
          add(CrewRole.MIXER_OPERATOR, mixerPool);
          add(CrewRole.TROLLY_1_WHEEL, trollyPool);
          add(CrewRole.TROLLY_1_WHEEL, trollyPool);
          add(CrewRole.TROLLY_2_WHEEL, trollyPool);
          add(CrewRole.SUB_LEADER, [wk1]);
          add(CrewRole.HELPER, [...helperPool, ...mixerPool]);
          add(CrewRole.HELPER, [...helperPool, ...mixerPool]);
          tools.push({ toolId:"TL-001",qty:2 },{ toolId:"TL-003",qty:4 },{ toolId:"TL-004",qty:2 },{ toolId:"TL-005",qty:8 });
          break;
        }
        case "H": { 
          machineId = mix3.id;
          charge = 8500 + (ji % 2) * 500; opDailyRate = 1300; helperCount = 5;
          const hOp = p(hydraulicPool);
          if (hOp) { crew.push({ role: CrewRole.HYDRAULIC_OPERATOR, emp: hOp }); used.add(hOp.id); }
          add(CrewRole.TROLLY_1_WHEEL, trollyPool);
          add(CrewRole.HELPER, [...helperPool, ...mixerPool]);
          add(CrewRole.HELPER, [...helperPool, ...mixerPool]);
          tools.push({ toolId:"TL-003",qty:2 },{ toolId:"TL-005",qty:4 });
          break;
        }
        case "I": { 
          vibratorId = vib1Broken ? vib2.id : (ji % 2 === 0 ? vib1.id : vib2.id);
          charge = 3800 + (ji % 3) * 300; opDailyRate = 1000; helperCount = 3;
          addLeaderToCrew(CrewRole.VIBRATOR_OPERATOR);
          add(CrewRole.HELPER, [...helperPool, ...mixerPool]);
          add(CrewRole.HELPER, [...helperPool, ...mixerPool]);
          tools.push({ toolId:"TL-002",qty:2 },{ toolId:"TL-005",qty:2 });
          break;
        }
        case "J": { 
          liftId = lft2.id; vibratorId = vib1Broken ? vib2.id : vib1.id;
          charge = 7000 + (ji % 3) * 500; opDailyRate = 1500; helperCount = 5;
          const lOp = p(liftPool);
          if (lOp) { crew.push({ role: CrewRole.LIFT_OPERATOR, emp: lOp }); used.add(lOp.id); }
          add(CrewRole.P_VIBRATOR, vibratorPool);
          add(CrewRole.HELPER, [...helperPool, ...mixerPool]);
          add(CrewRole.HELPER, [...helperPool, ...mixerPool]);
          tools.push({ toolId:"TL-002",qty:1 },{ toolId:"TL-004",qty:2 },{ toolId:"TL-005",qty:3 });
          break;
        }
      }

      const isCancelled = status === DispatchStatus.CANCELLED;
      const primaryOpId = crew[0]?.emp.id;

      const dispatch = await prisma.dailyDispatch.create({
        data: {
          customerId:           customer.id,
          machineId:            machineId  ?? undefined,
          vibratorId:           vibratorId ?? undefined,
          liftId:               liftId     ?? undefined,
          driverId:             driver.id,
          operatorId:           primaryOpId,
          location,
          dateOfService:        date,
          status,
          workType:             WorkType.NORMAL,
          customerCharge:       isCancelled ? 0 : charge,
          operatorDailyRate:    isCancelled ? 0 : opDailyRate,
          helperCount:          isCancelled ? 0 : helperCount,
          siteLeaderEmployeeId: siteLeader.id,
          isPrimaryBillingRow:  true,
          version:              1,
        },
      });
      cntDispatch++;

      const savedToolIds: string[] = [];
      for (const c of crew) {
        try {
          await prisma.dispatchAssignment.create({
            data: {
              dispatchId:    dispatch.id,
              employeeId:    c.emp.id,
              assignedRole:  c.role,
              lockedWageRate: WAGE[c.role] || 500,
            },
          });
          cntAssign++;
        } catch (e: any) {
          if (!e.message?.includes("Unique")) throw e;
        }
      }

      for (const t of tools) {
        const dbToolId = toolMap[t.toolId];
        if (!dbToolId) continue;
        try {
          const dt = await prisma.dispatchTool.create({
            data: { dispatchId: dispatch.id, toolId: dbToolId, quantity: t.qty },
          });
          savedToolIds.push(dt.id);
          cntTools++;
        } catch (e: any) {
          if (!e.message?.includes("Unique")) throw e;
        }
      }

      if (status === DispatchStatus.COMPLETED && !isCancelled && charge > 0 && primaryOpId) {
        try {
          await prisma.cashCollection.create({
            data: {
              operatorId:    primaryOpId,
              dispatchId:    dispatch.id,
              amountCollected: charge,
              date,
              status:        "DEPOSITED",
              confirmedById: staff1.id,
              confirmedAt:   addDays(date, 1),
            },
          });
          cntCash++;
        } catch {}
      }

      dispatchMeta.push({
        id:          dispatch.id,
        date,
        status,
        siteLeaderId: siteLeader.id,
        crewIds:     crew.map(c => c.emp.id),
        toolIds:     savedToolIds,
      });
    }

    if (di % 7 === 0) process.stdout.write(`  📅 ${date.toDateString()} (${di + 1}/${dates.length})\n`);
  }

  console.log(`\n  ✅ ${cntDispatch} dispatches | ${cntAssign} crew assignments | ${cntTools} tool records | ${cntCash} cash collections.\n`);

  // ════════════════════════════════════════════════════════════════════
  // PHASE 3 — MAINTENANCE TICKETS
  // ════════════════════════════════════════════════════════════════════
  console.log("🔩 Seeding maintenance tickets...");
  await prisma.maintenanceTicket.createMany({
    data: [
      { machineId: mix2.id, issueDescription: "Engine belt snapped", mechanicName: "Abdul", partsCost: 1800, laborCost: 600, status: "RESOLVED", resolvedAt: new Date("2026-08-07") },
      { machineId: vib1.id, issueDescription: "Vibrator shaft bent", mechanicName: "Manoj Workshop", partsCost: 2200, laborCost: 800, status: "RESOLVED", resolvedAt: new Date("2026-08-22") },
      { machineId: vib2.id, issueDescription: "Routine service", mechanicName: "Abdul", partsCost: 400, laborCost: 200, status: "RESOLVED", resolvedAt: new Date("2026-08-10") },
    ],
  });
  console.log("  ✅ 3 maintenance tickets.\n");

  // ════════════════════════════════════════════════════════════════════
  // PHASE 4 — FIELD DIARY LOGS & PINGS
  // ════════════════════════════════════════════════════════════════════
  console.log("📝 Seeding Field Diary Logs, Equip Verify & GPS Pings...");

  const recentDispatches = dispatchMeta.filter(d => {
    const diff = differenceInDays(TODAY, d.date);
    return diff >= 0 && diff <= 5 &&
           (d.status === DispatchStatus.COMPLETED || d.status === DispatchStatus.IN_PROGRESS);
  });

  let cntDiary = 0, cntAttendance = 0, cntEquipVerify = 0, cntPings = 0;

  for (const dd of recentDispatches) {
    const isCompleted = dd.status === DispatchStatus.COMPLETED;
    const isToday = dd.date.getTime() === TODAY.getTime();
    if (dd.toolIds.length === 0) continue;

    try {
      const diary = await prisma.fieldDiaryLog.create({
        data: {
          dispatchId:          dd.id,
          loggedByLeaderId:    dd.siteLeaderId,
          date:                dd.date,
          siteStatus:          isCompleted ? "COMPLETED" : "IN_PROGRESS",
          arrivalTime:         new Date(dd.date.getTime() + 7 * 3600000),
          departureTime:       isCompleted ? new Date(dd.date.getTime() + 17 * 3600000) : null,
          internalHelperCount: 4,
          notes:               isCompleted ? "Completed." : "In progress.",
          isSubmitted:         isCompleted,
          submittedAt:         isCompleted ? new Date(dd.date.getTime() + 18 * 3600000) : null,
        },
      });
      cntDiary++;

      for (const empId of dd.crewIds) {
        try {
          await prisma.attendanceLog.create({
            data: { fieldDiaryLogId: diary.id, employeeId: empId, isPresent: true, markedAt: new Date(dd.date.getTime() + 7.5 * 3600000) },
          });
          cntAttendance++;
        } catch {}
      }

      if (isCompleted) {
        for (const dtId of dd.toolIds) {
          try {
            await prisma.equipmentVerificationLog.create({
              data: { fieldDiaryLogId: diary.id, dispatchToolId: dtId, isReturned: true, condition: "OK", notes: "Returned." },
            });
            cntEquipVerify++;
          } catch {}
        }
      }
    } catch (e: any) {
      if (!e.message?.includes("Unique")) throw e;
    }
  }

  const todayActive = dispatchMeta.filter(d => d.status === DispatchStatus.IN_PROGRESS).slice(0, 3);
  const baseCoords = [{ lat: 10.8505, lng: 76.2711 }, { lat: 10.9167, lng: 76.2345 }, { lat: 10.8832, lng: 76.3120 }];
  
  for (let i = 0; i < todayActive.length; i++) {
    const dd = todayActive[i];
    const base = baseCoords[i] ?? baseCoords[0];
    for (let p = 0; p < 10; p++) {
      await prisma.locationPing.create({
        data: { employeeId: dd.siteLeaderId, dispatchId: dd.id, latitude: base.lat + p * 0.0001, longitude: base.lng + p * 0.0001, accuracy: 8 + (p % 5), timestamp: new Date(TODAY.getTime() + (8 + p) * 3600000) },
      });
      cntPings++;
    }
  }

  console.log(`  ✅ ${cntDiary} diaries | ${cntAttendance} attendance | ${cntEquipVerify} verifications | ${cntPings} GPS pings.\n`);

  // ════════════════════════════════════════════════════════════════════
  // PHASE 5 — FINANCES (Advances & Settlements)
  // ════════════════════════════════════════════════════════════════════
  console.log("💰 Seeding finances...");
  const advances = [
    { empId: op1.id, amount: 1500, date: new Date("2026-08-05") },
    { empId: drv1.id, amount: 1000, date: new Date("2026-08-06") },
  ];
  for (const a of advances) {
    await prisma.salaryAdvance.create({ data: { employeeId: a.empId, amount: a.amount, date: a.date, status: "SETTLED", notes: "Approved." }});
  }

  const settleEmps = [op1, op2, op3, drv1, drv2, wk1];
  const weekEndings = [
    { date: new Date("2026-08-03"), finalized: true  },
    { date: new Date("2026-08-24"), finalized: false },
  ];
  let cntSettle = 0;
  for (const week of weekEndings) {
    for (const emp of settleEmps) {
      try {
        const earned = 6000 + ((emp.id.charCodeAt(0) + week.date.getDate()) % 3000);
        await prisma.settlement.create({
          data: {
            employeeId: emp.id, weekEnding: week.date, finalPayout: earned,
            status: week.finalized ? SettlementStatus.FINALIZED : SettlementStatus.PENDING,
            notes: week.finalized ? "Settled" : "Draft",
          },
        });
        cntSettle++;
      } catch (e: any) {
        if (!e.message?.includes("Unique")) throw e;
      }
    }
  }

  console.log(`  ✅ ${advances.length} advances | ${cntSettle} settlements.\n`);

  console.log("═".repeat(65));
  console.log("🎉 IronRent Unified Heavy Seed v3.0 COMPLETE!\n");
  console.log("\n🔑 Owner login : akshairajesh07@gmail.com / admin123");
}

main()
  .catch(e => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
