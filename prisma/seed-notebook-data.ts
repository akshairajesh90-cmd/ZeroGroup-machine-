import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, MachineType, WorkType, DispatchStatus } from "@prisma/client";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://postgres:Akshai%402005@localhost:5432/zerogroup?schema=public",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error", "warn"] });

async function main() {
  console.log("ðŸŒ± Seeding Exact Zero Group Physical Notebook Data (05/07/2026 to 11/07/2026) [V16.0 Idempotent Engine]...");

  // 1. Ensure Master Operators & Employees exist
  const operatorNames = [
    { name: "Rajesh bhai (Senior Operator)", email: "rajesh@zerogroup.in", rate: 1000, role: Role.OPERATOR },
    { name: "Subil Kumar (Operator)", email: "subil@zerogroup.in", rate: 1000, role: Role.OPERATOR },
    { name: "Pokkan (Lift & Machine Operator)", email: "pokkan@zerogroup.in", rate: 1000, role: Role.OPERATOR },
    { name: "Tapan (Vibrator & Trolly Operator)", email: "tapan@zerogroup.in", rate: 1000, role: Role.OPERATOR },
    { name: "Pulkith (Machine Operator)", email: "pulkith@zerogroup.in", rate: 1000, role: Role.OPERATOR },
    { name: "Sanjay (Vibrator Operator)", email: "sanjay@zerogroup.in", rate: 1000, role: Role.OPERATOR },
    { name: "Kailas (Machine Operator)", email: "kailas@zerogroup.in", rate: 1000, role: Role.OPERATOR },
    { name: "Tuna (Machine Operator)", email: "tuna@zerogroup.in", rate: 1000, role: Role.OPERATOR },
    { name: "Mutta (Trolly Operator)", email: "mutta@zerogroup.in", rate: 1000, role: Role.OPERATOR },
    { name: "Amith (New bhai)", email: "amith@zerogroup.in", rate: 1000, role: Role.OPERATOR },
    { name: "Vijay (Operator)", email: "vijay@zerogroup.in", rate: 1000, role: Role.OPERATOR },
    { name: "Suresh (Driver)", email: "suresh@zerogroup.in", rate: 900, role: Role.DRIVER },
  ];

  const empMap = new Map<string, string>();
  for (const op of operatorNames) {
    let user = await prisma.user.findFirst({ where: { email: op.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: op.email,
          hashedPassword: "$2a$10$defaultHashUnused",
          role: op.role || Role.OPERATOR,
        },
      });
    }
    const emp = await prisma.employee.upsert({
      where: { userId: user.id },
      update: { name: op.name, role: op.role },
      create: {
        name: op.name,
        role: op.role,
        userId: user.id,
      },
    });
    empMap.set(op.name.split(" ")[0].toLowerCase(), emp.id);
  }

  // 2. Upsert All 14 Customers & Sites from the Notebook
  const notebookCustomers = [
    { name: "à´¸àµà´µà´¾à´®à´¿ à´¨à´Ÿà´¾àµ½ (Swami - Nadal)", phone: "9048640535", address: "Nadakkal / Nadal" },
    { name: "à´¸à´•àµà´•àµ€àµ¼ à´µà´Ÿà´•àµà´•àµ» (Sakeer Vadakkan)", phone: "9847340839", address: "Vadakkan Site" },
    { name: "à´·à´¿à´¬à´¿à´²à´¿ à´®à´¾à´¤à´®à´‚à´—à´²à´‚ (Shibili Mathamangalam)", phone: "8075883840", address: "Mathamangalam" },
    { name: "à´°à´¾à´œàµ à´•àµà´¨àµà´¨àµ‹à´¨à´¿ (Raju Kunnoni)", phone: "9496412920", address: "Kunnoni" },
    { name: "à´¸à´¿à´¦àµà´§àµ€à´–àµ à´¨àµ†à´²àµà´²à´¿à´•àµà´•àµà´¨àµà´¨àµ (Siddique - Nellikunnu)", phone: "9447000001", address: "Nellikunnu" },
    { name: "à´…à´¨à´¸àµ à´•à´¾à´žàµà´žà´¿à´°à´ªàµà´ªà´³àµà´³à´¿ (Anas - Kanjirappally)", phone: "8848796317", address: "Kanjirappally Road Work" },
    { name: "à´®àµà´°à´³à´¿ à´‰à´£à´¿à´šàµà´šà´¾à´®à´° (Murali - Unichamara)", phone: "9446197584", address: "Unichamara" },
    { name: "Noble (Noble Site)", phone: "7907141698", address: "Noble Local Site" },
    { name: "à´®à´§àµ à´­à´¾à´¯à´¿ à´¨à´Ÿà´•àµà´•àµ½ (Madhu Bhai - Nadakkal)", phone: "7012670678", address: "Nadakkal / Ullanpara" },
    { name: "à´®à´£à´¿à´•à´£àµà´ àµ» à´•àµ‹à´£à´¿à´ªàµà´ªà´Ÿ (Manikandan - Konippada)", phone: "7306148480", address: "Konippada" },
    { name: "à´œàµ‹à´¸àµ à´®àµ‡à´¸àµà´¤à´¿à´°à´¿ (Jose Mestri)", phone: "9847272234", address: "Jose Mestri Site" },
    { name: "à´«àµˆà´¸àµ½ à´‰à´¦à´¯à´•àµà´•à´° (Faisal - Odayakkal)", phone: "7907246126", address: "Odayakkal" },
    { name: "à´°à´¾à´œàµ à´®à´¾à´¤à´®à´‚à´—à´²à´‚ (Raju Mathamangalam)", phone: "9846001122", address: "Mathamangalam" },
    { name: "à´®à´¨àµ‹à´œàµ à´ªàµ‚à´•àµà´•àµ‹à´¤àµà´¤àµ (Manoj Pookoth)", phone: "9447112233", address: "Pookoth" },
    { name: "Plywood Company (Plywood)", phone: "9447223344", address: "Industrial Area" },
  ];

  const custMap = new Map<string, string>();
  for (const c of notebookCustomers) {
    let existing = await prisma.customer.findFirst({ where: { name: c.name } });
    if (!existing) {
      existing = await prisma.customer.create({ data: c });
    } else {
      await prisma.customer.update({ where: { id: existing.id }, data: c });
    }
    custMap.set(c.name.split(" ")[0].toLowerCase(), existing.id);
  }

  // Ensure standard machines exist for linking
  const mixer = await prisma.machine.findFirst({ where: { type: MachineType.MIXER } });
  const lift = await prisma.machine.findFirst({ where: { type: MachineType.LIFT } });
  const machineIdToUse = mixer?.id || lift?.id;

  // 3. Exact Idempotent Daily Bookings with Immutable Snapshots & Split Crew
  interface BookingSeedItem {
    date: string;
    custKey: string;
    siteBundleId: string;
    location: string;
    workType?: WorkType;
    status?: DispatchStatus;
    opKey: string;
    rate: number;
    actualWagePaid: number;
    notes: string;
    liftFloors?: number;
    multiOps?: Array<{ opKey: string; name: string; wage: number }>;
    laborCrews?: Array<{
      externalName: string;
      headCount: number;
      helperCount: number;
      lumpSumWage: number;
      actualWagePaid: number;
      internalHeadCount?: number;
      externalHeadCount?: number;
      outsideWagePaid?: number;
      isExternalLiability?: boolean;
    }>;
  }

  const bookingsToInsert: BookingSeedItem[] = [
    // --- 05/07/2026 (Sunday) ---
    {
      date: "2026-07-05",
      custKey: "à´¸àµà´µà´¾à´®à´¿",
      siteBundleId: "2026-07-05-SWAMI-1",
      location: "Nadakkal / Nadal (#1)",
      workType: WorkType.NORMAL,
      opKey: "rajesh",
      rate: 1800,
      actualWagePaid: 1000,
      notes: "Machine - PKJ (`Varavu: â‚¹1800, Chilavu: â‚¹1000 â€” Rajesh bhai`)",
    },
    {
      date: "2026-07-05",
      custKey: "à´°à´¾à´œàµ",
      siteBundleId: "2026-07-05-RAJU-2",
      location: "Mathamangalam (#2)",
      workType: WorkType.NORMAL,
      opKey: "rajesh",
      rate: 1800,
      actualWagePaid: 1000,
      notes: "Machine (`Varavu: â‚¹1800, Chilavu: â‚¹1000`)",
    },

    // --- 06/07/2026 (Monday) ---
    {
      date: "2026-07-06",
      custKey: "à´®à´§àµ",
      siteBundleId: "2026-07-06-MADHU-1",
      location: "Nadakkal / Ullanpara (#1)",
      workType: WorkType.TROLLY,
      opKey: "pokkan",
      rate: 2200,
      actualWagePaid: 2200,
      liftFloors: 1,
      notes: "Lift (1) Nila + Vibrator + 3x Trolly (`Pokkan @ â‚¹2,200`)",
      multiOps: [
        { opKey: "tapan", name: "Tapan (Trolly)", wage: 1500 },
        { opKey: "mutta", name: "Mutta (Trolly)", wage: 1500 },
      ],
    },
    {
      date: "2026-07-06",
      custKey: "à´®à´¨àµ‹à´œàµ",
      siteBundleId: "2026-07-06-MANOJ-2",
      location: "Pookoth (#2)",
      workType: WorkType.NORMAL,
      opKey: "rajesh",
      rate: 1700,
      actualWagePaid: 1700,
      liftFloors: 1,
      notes: "Lift 1st floor (`Rajesh @ â‚¹1,700`) + Hydraulic Machine (`Subil`) + Pulkith (`Pani`)",
      multiOps: [
        { opKey: "subil", name: "Subil Kumar (Hydraulic Machine)", wage: 1100 },
        { opKey: "pulkith", name: "Pulkith (Pani / Helper)", wage: 1100 },
      ],
    },

    // --- 07/07/2026 (Tuesday) ---
    {
      date: "2026-07-07",
      custKey: "à´°à´¾à´œàµ",
      siteBundleId: "2026-07-07-RAJU-1",
      location: "Kunnoni (#1)",
      workType: WorkType.TROLLY,
      opKey: "subil",
      rate: 2200,
      actualWagePaid: 1700,
      liftFloors: 1,
      notes: "Lift (1) Nila - Subil (`â‚¹1,700`) + Pulkith (`â‚¹1,000`) + Mutta & Tapan Trolly (`â‚¹1,800 + â‚¹1,800`)",
      multiOps: [
        { opKey: "pulkith", name: "Pulkith (Machine)", wage: 1000 },
        { opKey: "mutta", name: "Mutta (Trolly)", wage: 1800 },
        { opKey: "tapan", name: "Tapan (Trolly)", wage: 1800 },
        { opKey: "amith", name: "Amith (New bhai)", wage: 1000 },
      ],
      laborCrews: [
        {
          externalName: "Panikar Kaka Crew",
          headCount: 1,
          helperCount: 3,
          lumpSumWage: 4800,
          actualWagePaid: 4800,
          internalHeadCount: 4,
          externalHeadCount: 0,
        },
      ],
    },
    // Cancelled Shift Example (Requirement 3)
    {
      date: "2026-07-07",
      custKey: "à´¸à´¿à´¦àµà´§àµ€à´–àµ",
      siteBundleId: "2026-07-07-SIDDIQUE-2-CANCELLED",
      location: "Nellikunnu (#2 - Cancelled)",
      workType: WorkType.NORMAL,
      status: DispatchStatus.CANCELLED,
      opKey: "kailas",
      rate: 0,
      actualWagePaid: 0,
      notes: "(2) - Cancelled Shift",
    },
    {
      date: "2026-07-07",
      custKey: "à´…à´¨à´¸àµ",
      siteBundleId: "2026-07-07-ANAS-3",
      location: "Kanjirappally (#3)",
      workType: WorkType.NORMAL,
      opKey: "kailas",
      rate: 1800,
      actualWagePaid: 1000,
      notes: "Machine - Kailas (`â‚¹1,000`)",
    },
    {
      date: "2026-07-07",
      custKey: "à´®àµà´°à´³à´¿",
      siteBundleId: "2026-07-07-MURALI-4",
      location: "Unichamara (#4)",
      workType: WorkType.NORMAL,
      opKey: "rajesh",
      rate: 2200,
      actualWagePaid: 2200,
      liftFloors: 2,
      notes: "Lift (2) Nila - Rajesh (`â‚¹2,200`) + Machine (`Manoj â‚¹1,000`) + P.Vibrator (`Sanjay â‚¹1,000`)",
      multiOps: [
        { opKey: "sanjay", name: "Sanjay (P.Vibrator)", wage: 1000 },
      ],
      laborCrews: [
        {
          externalName: "Panikar Kaka Crew",
          headCount: 1,
          helperCount: 4,
          lumpSumWage: 6000,
          actualWagePaid: 6000,
          internalHeadCount: 5,
          externalHeadCount: 0,
        },
        {
          externalName: "Chottu Crew",
          headCount: 1,
          helperCount: 0,
          lumpSumWage: 1200,
          actualWagePaid: 1200,
          internalHeadCount: 1,
          externalHeadCount: 0,
        },
      ],
    },
    // Cancelled Shift Example #5
    {
      date: "2026-07-07",
      custKey: "à´¸à´•àµà´•àµ€àµ¼",
      siteBundleId: "2026-07-07-SAKEER-5-CANCELLED",
      location: "Vadakkan (#5 - Cancelled)",
      workType: WorkType.NORMAL,
      status: DispatchStatus.CANCELLED,
      opKey: "pokkan",
      rate: 0,
      actualWagePaid: 0,
      notes: "(5) - Cancelled Shift",
    },
    {
      date: "2026-07-07",
      custKey: "noble",
      siteBundleId: "2026-07-07-NOBLE-6",
      location: "Noble Local Site (#6)",
      workType: WorkType.NORMAL,
      opKey: "rajesh",
      rate: 1800,
      actualWagePaid: 1200,
      notes: "(6) Machine - Kaka (`â‚¹1,200`) + Chottu (3 bhai = â‚¹3,600)",
      laborCrews: [
        {
          externalName: "Chottu Crew",
          headCount: 1,
          helperCount: 2,
          lumpSumWage: 3600,
          actualWagePaid: 3600,
          internalHeadCount: 3,
          externalHeadCount: 0,
        },
      ],
    },
    {
      date: "2026-07-07",
      custKey: "à´·à´¿à´¬à´¿à´²à´¿",
      siteBundleId: "2026-07-07-SHIBILI-7",
      location: "Mathamangalam (#7)",
      workType: WorkType.NORMAL,
      opKey: "tuna",
      rate: 1800,
      actualWagePaid: 1000,
      notes: "(7) Machine - Tuna (`â‚¹1,000`) + Panikar Chottu (5 bhai = â‚¹6,000)",
      laborCrews: [
        {
          externalName: "Chottu Crew",
          headCount: 1,
          helperCount: 4,
          lumpSumWage: 6000,
          actualWagePaid: 6000,
          internalHeadCount: 5,
          externalHeadCount: 0,
        },
      ],
    },

    // --- 08/07/2026 (Wednesday) ---
    {
      date: "2026-07-08",
      custKey: "à´¸à´•àµà´•àµ€àµ¼",
      siteBundleId: "2026-07-08-SAKEER-1",
      location: "Vadakkan Site (#1)",
      workType: WorkType.NORMAL,
      opKey: "pokkan",
      rate: 2200,
      actualWagePaid: 2200,
      liftFloors: 2,
      notes: "Lift - 2 Nila (`Pokkan @ â‚¹2,200`) + Machine/Mixer (`Subil @ â‚¹1,000`) + Chottu (11 bhai = â‚¹13,200)",
      multiOps: [
        { opKey: "subil", name: "Subil Kumar (Mixer)", wage: 1000 },
      ],
      laborCrews: [
        {
          externalName: "Chottu Crew",
          headCount: 1,
          helperCount: 10,
          lumpSumWage: 13200,
          actualWagePaid: 13200,
          internalHeadCount: 11,
          externalHeadCount: 0,
        },
      ],
    },
    {
      date: "2026-07-08",
      custKey: "à´·à´¿à´¬à´¿à´²à´¿",
      siteBundleId: "2026-07-08-SHIBILI-2",
      location: "Mathamangalam (#2)",
      workType: WorkType.NORMAL,
      opKey: "rajesh",
      rate: 2200,
      actualWagePaid: 2200,
      liftFloors: 2,
      notes: "Lift - 2 Nila (`Rajesh @ â‚¹2,200`) + Machine (`Tapan â‚¹1,000`) + Kaka Crew (9 bhai @ â‚¹10,800)",
      multiOps: [
        { opKey: "tapan", name: "Tapan (Machine)", wage: 1000 },
      ],
      laborCrews: [
        {
          externalName: "Panikar Kaka Crew",
          headCount: 1,
          helperCount: 8,
          lumpSumWage: 10800,
          actualWagePaid: 10800,
          internalHeadCount: 9,
          externalHeadCount: 0,
        },
        {
          externalName: "Tuna Bhai (1)",
          headCount: 1,
          helperCount: 0,
          lumpSumWage: 1200,
          actualWagePaid: 1200,
          internalHeadCount: 1,
          externalHeadCount: 0,
        },
      ],
    },
    {
      date: "2026-07-08",
      custKey: "à´°à´¾à´œàµ",
      siteBundleId: "2026-07-08-RAJU-3",
      location: "Kunnoni (#3)",
      workType: WorkType.NORMAL,
      opKey: "kailas",
      rate: 1800,
      actualWagePaid: 1000,
      notes: "(3) Machine - Kailas (`â‚¹1,000`)",
    },
    // Requirement 3: Vijay No Op / Cancelled
    {
      date: "2026-07-08",
      custKey: "à´®àµà´°à´³à´¿",
      siteBundleId: "2026-07-08-VIJAY-4-NOOP",
      location: "Unichamara (#4 - No op)",
      workType: WorkType.NORMAL,
      status: DispatchStatus.CANCELLED,
      opKey: "vijay",
      rate: 0,
      actualWagePaid: 0,
      notes: "(4) Vijay - No op (`â‚¹0`)",
    },
    // Requirement 5: Split Crew Attributions (Plywood Company)
    {
      date: "2026-07-08",
      custKey: "plywood",
      siteBundleId: "2026-07-08-PLYWOOD-BOX",
      location: "Plywood Company Box (#5)",
      workType: WorkType.NORMAL,
      opKey: "rajesh",
      rate: 4800,
      actualWagePaid: 0, // Master op is 0 since laborCrews track the exact split
      notes: "Plywood Company â€” 4 bhai (3 our ron bhai Mutta, Pulkith, Amith + 1 outside â€” already paid)",
      laborCrews: [
        {
          externalName: "Plywood Company Laborers (4 bhai)",
          headCount: 1,
          helperCount: 3,
          lumpSumWage: 4800, // Total value of work
          actualWagePaid: 3600, // Internal liability ONLY (3 x â‚¹1,200)
          internalHeadCount: 3,
          externalHeadCount: 1,
          outsideWagePaid: 1200,
          isExternalLiability: true,
        },
      ],
    },

    // --- 09/07/2026 (Thursday) ---
    {
      date: "2026-07-09",
      custKey: "à´®à´£à´¿à´•à´£àµà´ àµ»",
      siteBundleId: "2026-07-09-MANIKANDAN-1",
      location: "Konippada (#1)",
      workType: WorkType.NORMAL,
      opKey: "rajesh",
      rate: 1800,
      actualWagePaid: 1000,
      notes: "(1) Machine - Rajesh bhai (`â‚¹1,000`)",
    },
    {
      date: "2026-07-09",
      custKey: "à´œàµ‹à´¸àµ",
      siteBundleId: "2026-07-09-JOSE-2",
      location: "Jose Mestri Site (#2)",
      workType: WorkType.TROLLY,
      opKey: "pokkan",
      rate: 2200,
      actualWagePaid: 2200,
      liftFloors: 2,
      notes: "(2) Lift (2) Nila - Pokkan (`â‚¹2,200`)",
    },
    {
      date: "2026-07-09",
      custKey: "à´…à´¨à´¸àµ",
      siteBundleId: "2026-07-09-ANAS-3",
      location: "Kanjirappally (#3)",
      workType: WorkType.NORMAL,
      opKey: "mutta",
      rate: 1800,
      actualWagePaid: 1000,
      notes: "(3) Machine - Mutta (`â‚¹1,000`)",
    },
    {
      date: "2026-07-09",
      custKey: "à´«àµˆà´¸àµ½",
      siteBundleId: "2026-07-09-FAISAL-4",
      location: "Odayakkal (#4)",
      workType: WorkType.NORMAL,
      opKey: "tapan",
      rate: 1800,
      actualWagePaid: 1000,
      notes: "(4) Machine - Tapan (`â‚¹1,000`)",
    },

    // --- 10/07/2026 (Friday) ---
    {
      date: "2026-07-10",
      custKey: "à´®à´¨àµ‹à´œàµ",
      siteBundleId: "2026-07-10-MANOJ-1",
      location: "Pookoth (#1)",
      workType: WorkType.NORMAL,
      opKey: "pokkan",
      rate: 1700,
      actualWagePaid: 1700,
      liftFloors: 1,
      notes: "(1) Lift (1) Nila - Pokkan (`â‚¹1,700`) + Petrol Vibrator (`Tapan â‚¹1,000`)",
      multiOps: [
        { opKey: "tapan", name: "Tapan (Petrol Vibrator)", wage: 1000 },
      ],
    },
    {
      date: "2026-07-10",
      custKey: "à´·à´¿à´¬à´¿à´²à´¿",
      siteBundleId: "2026-07-10-SHIBILI-2",
      location: "Mathamangalam (#2)",
      workType: WorkType.NORMAL,
      opKey: "rajesh",
      rate: 1700,
      actualWagePaid: 1700,
      liftFloors: 1,
      notes: "(2) Lift (1) Nila - Rajesh bhai (`â‚¹1,700`) + Mixer (`Subil â‚¹1,000`)",
      multiOps: [
        { opKey: "subil", name: "Subil Kumar (Mixer)", wage: 1000 },
      ],
    },

    // --- 11/07/2026 (Saturday) ---
    {
      date: "2026-07-11",
      custKey: "à´®à´¨àµ‹à´œàµ",
      siteBundleId: "2026-07-11-MANOJ-3",
      location: "Pookoth (#3)",
      workType: WorkType.NORMAL,
      opKey: "rajesh",
      rate: 1700,
      actualWagePaid: 1700,
      liftFloors: 1,
      notes: "(3) Lift (1) Nila - Rajesh (`â‚¹1,700`) + Machine (`Pulkith â‚¹1,000`) + P.Vibrator (`Sanjay â‚¹1,000`) + Trolly (`Mutta & Tapan â‚¹1,500 + â‚¹1,500`)",
      multiOps: [
        { opKey: "pulkith", name: "Pulkith (Machine)", wage: 1000 },
        { opKey: "sanjay", name: "Sanjay (P.Vibrator)", wage: 1000 },
        { opKey: "mutta", name: "Mutta (Trolly)", wage: 1500 },
        { opKey: "tapan", name: "Tapan (Trolly)", wage: 1500 },
      ],
    },
    {
      date: "2026-07-11",
      custKey: "à´·à´¿à´¬à´¿à´²à´¿",
      siteBundleId: "2026-07-11-SHIBILI-4",
      location: "Mathamangalam (#4)",
      workType: WorkType.NORMAL,
      opKey: "tuna",
      rate: 1800,
      actualWagePaid: 1000,
      notes: "(4) Machine - Tuna (`â‚¹1,000`) + Panikane (13) = Sharaf (1 @ â‚¹1,200) + Panikar (12 @ â‚¹14,400)",
      laborCrews: [
        {
          externalName: "Sharaf Bhai",
          headCount: 1,
          helperCount: 0,
          lumpSumWage: 1200,
          actualWagePaid: 1200,
          internalHeadCount: 1,
          externalHeadCount: 0,
        },
        {
          externalName: "Panikar Kaka Crew",
          headCount: 1,
          helperCount: 11,
          lumpSumWage: 14400,
          actualWagePaid: 14400,
          internalHeadCount: 12,
          externalHeadCount: 0,
        },
      ],
    },
    {
      date: "2026-07-11",
      custKey: "à´¸à´•àµà´•àµ€àµ¼",
      siteBundleId: "2026-07-11-SAKEER-5",
      location: "Vadakkan Site (#5)",
      workType: WorkType.NORMAL,
      opKey: "subil",
      rate: 1800,
      actualWagePaid: 1000,
      notes: "(5) Machine - Subil (`â‚¹1,000`)",
    },
    {
      date: "2026-07-11",
      custKey: "à´°à´¾à´œàµ",
      siteBundleId: "2026-07-11-RAJU-6",
      location: "Kunnoni (#6)",
      workType: WorkType.NORMAL,
      opKey: "pulkith",
      rate: 1800,
      actualWagePaid: 1000,
      notes: "(6) Dileep machine - Pulkith (`â‚¹1,000`)",
    },
  ];

  for (const b of bookingsToInsert) {
    // Find customer ID
    let custId = custMap.get(b.custKey);
    if (!custId) {
      for (const [k, v] of Array.from(custMap.entries())) {
        if (k.includes(b.custKey) || b.custKey.includes(k)) {
          custId = v;
          break;
        }
      }
    }
    if (!custId) custId = Array.from(custMap.values())[0];

    // Find primary operator ID
    const opId = empMap.get(b.opKey) || empMap.get("rajesh");
    const dateObj = new Date(b.date);

    // Idempotent UPSERT using compound unique index [dateOfService, customerId, siteBundleId]
    const dispatch = await prisma.dailyDispatch.upsert({
      where: {
        dateOfService_customerId_siteBundleId: {
          dateOfService: dateObj,
          customerId: custId,
          siteBundleId: b.siteBundleId,
        },
      },
      update: {
        machineId: machineIdToUse,
        operatorId: opId,
        location: b.location,
        workType: b.workType || WorkType.NORMAL,
        status: b.status || DispatchStatus.COMPLETED,
        operatorDailyRate: b.rate,
        actualWagePaid: b.actualWagePaid,
        customerCharge: b.rate * 1.5,
        notes: b.notes,
        liftFloors: b.liftFloors || 1,
      },
      create: {
        dateOfService: dateObj,
        customerId: custId,
        siteBundleId: b.siteBundleId,
        machineId: machineIdToUse,
        operatorId: opId,
        location: b.location,
        workType: b.workType || WorkType.NORMAL,
        status: b.status || DispatchStatus.COMPLETED,
        operatorDailyRate: b.rate,
        actualWagePaid: b.actualWagePaid,
        customerCharge: b.rate * 1.5,
        notes: b.notes,
        liftFloors: b.liftFloors || 1,
      },
    });

    // Clear and re-upsert multiOps for this exact dispatch to maintain idempotency
    await prisma.dispatchAssignment.deleteMany({ where: { dispatchId: dispatch.id } });
    

    // Clear and re-upsert laborCrews for this exact dispatch to maintain idempotency
    await prisma.dispatchLabor.deleteMany({ where: { dispatchId: dispatch.id } });
    if (b.laborCrews && b.laborCrews.length > 0) {
      for (const crew of b.laborCrews) {
        await prisma.dispatchLabor.create({
          data: {
            dispatchId: dispatch.id,
            externalWorkerName: crew.externalName,
            headCount: crew.headCount,
            helperCount: crew.helperCount,
            lumpSumWage: crew.lumpSumWage,
            actualWagePaid: crew.actualWagePaid,
            internalHeadCount: crew.internalHeadCount ?? (crew.headCount + crew.helperCount),
            externalHeadCount: crew.externalHeadCount ?? 0,
            outsideWagePaid: crew.outsideWagePaid ?? 0,
            isExternalLiability: crew.isExternalLiability ?? false,
            notes: `${crew.headCount + crew.helperCount} total headcount @ â‚¹1,200 (${crew.internalHeadCount ?? (crew.headCount + crew.helperCount)} internal, ${crew.externalHeadCount ?? 0} outside)`,
          },
        });
      }
    }
    console.log(`âœ… Upserted Dispatch [${b.date}] at ${b.location} -> Status: ${b.status || "COMPLETED"} | ActualWage: â‚¹${b.actualWagePaid}`);
  }

  console.log("ðŸŽ‰ V16.0 Idempotent Engine: All exact physical notebook data successfully seeded & reconciled!");
}

main()
  .catch((e) => {
    console.error("âŒ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
