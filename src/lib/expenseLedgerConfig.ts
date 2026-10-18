export type MainLedgerKey = 
  | "MACHINES_EQUIPMENT"
  | "FLEET_TRANSPORT"
  | "STAFF_LABOR"
  | "TOOLS_CONSUMABLES"
  | "YARD_FACILITY"
  | "PETTY_CASH";

export interface ExpenseSubOption {
  id: string;
  label: string;
  dbCategory: "DIESEL" | "REPAIR" | "TRAVEL" | "STAFF_ADVANCE" | "CONTRACTOR_ADVANCE" | "OUTSIDE_HELPER_WAGE" | "TOOL_PARTS" | "WORKSHOP" | "RENT" | "PETTY_CASH" | "OTHER";
  description: string;
  requiredEntity?: "machine" | "vehicle" | "employee" | "contractor" | "tool" | "multi_workers";
  helperBadge?: string;
}

export interface MainLedgerHead {
  key: MainLedgerKey;
  title: string;
  subtitle: string;
  iconName: string;
  colorScheme: {
    bg: string;
    border: string;
    text: string;
    badge: string;
    pill: string;
  };
  subOptions: ExpenseSubOption[];
}

export const MAIN_LEDGER_HEADS: MainLedgerHead[] = [
  {
    key: "MACHINES_EQUIPMENT",
    title: "Machines & Equipment",
    subtitle: "Concrete Mixers, Lifts, Winches & Heavy Assets",
    iconName: "Wrench",
    colorScheme: {
      bg: "bg-amber-950/20",
      border: "border-amber-500/30",
      text: "text-amber-400",
      badge: "bg-amber-500/10 text-amber-300 border-amber-500/20",
      pill: "hover:border-amber-500/50 hover:bg-amber-500/10",
    },
    subOptions: [
      {
        id: "MACHINE_DIESEL",
        label: "Machine Fuel / Diesel",
        dbCategory: "DIESEL",
        description: "Fuel filled directly into concrete mixer or lift engines on site or depot.",
        requiredEntity: "machine",
        helperBadge: "Factors into Asset ROI & fuel threshold",
      },
      {
        id: "MACHINE_REPAIR",
        label: "Machine Repair & Mechanics",
        dbCategory: "REPAIR",
        description: "Welding, mechanic labor, motor rewinding, or replacement parts fixed to equipment.",
        requiredEntity: "machine",
        helperBadge: "Increases maintenance cost on asset",
      },
      {
        id: "MACHINE_LUBRICANT",
        label: "Engine Oil, Grease & Lubricants",
        dbCategory: "WORKSHOP",
        description: "Routine gearbox oil, hydraulic fluid top-ups, and bearing greasing.",
        requiredEntity: "machine",
      },
    ],
  },
  {
    key: "FLEET_TRANSPORT",
    title: "Fleet & Transport Logistics",
    subtitle: "Trucks, Pickup 407s, Delivery transit & Drivers",
    iconName: "Truck",
    colorScheme: {
      bg: "bg-blue-950/20",
      border: "border-blue-500/30",
      text: "text-blue-400",
      badge: "bg-blue-500/10 text-blue-300 border-blue-500/20",
      pill: "hover:border-blue-500/50 hover:bg-blue-500/10",
    },
    subOptions: [
      {
        id: "VEHICLE_FUEL",
        label: "Vehicle Fuel / Diesel",
        dbCategory: "DIESEL",
        description: "Fuel refills for company transport pickups, trailers, and trucks.",
        requiredEntity: "vehicle",
      },
      {
        id: "VEHICLE_SERVICE",
        label: "Vehicle Servicing & Tires",
        dbCategory: "REPAIR",
        description: "Tire puncture/replacement, brake maintenance, battery, and oil filter servicing.",
        requiredEntity: "vehicle",
      },
      {
        id: "TOLLS_TRANSIT",
        label: "Tolls, Parking & Transit Permits",
        dbCategory: "TRAVEL",
        description: "Highway toll charges, site parking fees, and road permit expenses.",
        requiredEntity: "vehicle",
      },
    ],
  },
  {
    key: "STAFF_LABOR",
    title: "Staff, Workers & Advances",
    subtitle: "Payroll advances, spot helper wages & contractor disbursements",
    iconName: "Users",
    colorScheme: {
      bg: "bg-emerald-950/20",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
      pill: "hover:border-emerald-500/50 hover:bg-emerald-500/10",
    },
    subOptions: [
      {
        id: "STAFF_SALARY_ADVANCE",
        label: "Staff Salary Advance",
        dbCategory: "STAFF_ADVANCE",
        description: "Early salary or cash advance given to internal employees or operators.",
        requiredEntity: "employee",
        helperBadge: "⚠️ Automatically deducted from weekly salary settlement",
      },
      {
        id: "OUTSIDE_HELPER_WAGES",
        label: "Outside Helper Gang Wages",
        dbCategory: "OUTSIDE_HELPER_WAGE",
        description: "Cash paid to a sub-leader / mestri for an outside helper team (Headcount × Daily Rate).",
        requiredEntity: "multi_workers",
        helperBadge: "Sub-Leader & Headcount calculator with auto-multiplication",
      },
      {
        id: "CONTRACTOR_ADVANCE",
        label: "Contractor / Mestri Advance",
        dbCategory: "CONTRACTOR_ADVANCE",
        description: "Advance payments issued to sub-contractors, external labor suppliers, or mestris.",
        requiredEntity: "contractor",
        helperBadge: "Deducted during contractor settlement",
      },
    ],
  },
  {
    key: "TOOLS_CONSUMABLES",
    title: "Tools & Consumables",
    subtitle: "Needles, mixer blades, clamps, safety & cables",
    iconName: "PenTool",
    colorScheme: {
      bg: "bg-violet-950/20",
      border: "border-violet-500/30",
      text: "text-violet-400",
      badge: "bg-violet-500/10 text-violet-300 border-violet-500/20",
      pill: "hover:border-violet-500/50 hover:bg-violet-500/10",
    },
    subOptions: [
      {
        id: "TOOL_PARTS_PURCHASE",
        label: "Vibrator Needles & Spares",
        dbCategory: "TOOL_PARTS",
        description: "Replacement needles, flexible shafts, couplings, and motor switches.",
        requiredEntity: "tool",
      },
      {
        id: "CONSUMABLES_BLADES",
        label: "Mixer Blades, Pan Spares & Clamps",
        dbCategory: "TOOL_PARTS",
        description: "Wear plates, replacement blades, scaffold clamps, and electrical wires.",
      },
    ],
  },
  {
    key: "YARD_FACILITY",
    title: "Yard & Facility Overheads",
    subtitle: "Depot rent, welding shop consumables & utilities",
    iconName: "Building2",
    colorScheme: {
      bg: "bg-rose-950/20",
      border: "border-rose-500/30",
      text: "text-rose-400",
      badge: "bg-rose-500/10 text-rose-300 border-rose-500/20",
      pill: "hover:border-rose-500/50 hover:bg-rose-500/10",
    },
    subOptions: [
      {
        id: "DEPOT_RENT",
        label: "Depot / Yard Land Rent",
        dbCategory: "RENT",
        description: "Monthly lease or rent for storage yard, workshop sheds, and depot land.",
      },
      {
        id: "WORKSHOP_MAINTENANCE",
        label: "Workshop Maintenance & Power",
        dbCategory: "WORKSHOP",
        description: "Yard electricity, water bills, oxygen/acetylene gas cylinders, welding rods.",
      },
    ],
  },
  {
    key: "PETTY_CASH",
    title: "Petty Cash & Daily Refreshments",
    subtitle: "Site tea, food bata, mobile recharges & ad-hoc",
    iconName: "Coins",
    colorScheme: {
      bg: "bg-cyan-950/20",
      border: "border-cyan-500/30",
      text: "text-cyan-400",
      badge: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
      pill: "hover:border-cyan-500/50 hover:bg-cyan-500/10",
    },
    subOptions: [
      {
        id: "FOOD_TEA_REFRESHMENT",
        label: "Site Tea, Food & Snacks",
        dbCategory: "PETTY_CASH",
        description: "Daily tea, lunch, or refreshment purchases for workers and site crews.",
      },
      {
        id: "EMERGENCY_MISC",
        label: "Ad-hoc Purchases & Stationeries",
        dbCategory: "OTHER",
        description: "Printing delivery books, marker pens, SIM recharge, and emergency spot purchases.",
      },
    ],
  },
];

/**
 * Maps an existing DB Expense row to its primary Ledger Head key
 */
export function getLedgerHeadForExpense(expense: {
  category: string;
  machineId?: string | null;
  vehicleId?: string | null;
  employeeId?: string | null;
  contractorId?: string | null;
  toolId?: string | null;
}): MainLedgerKey {
  if (expense.category === "STAFF_ADVANCE" || expense.category === "CONTRACTOR_ADVANCE" || expense.category === "OUTSIDE_HELPER_WAGE") {
    return "STAFF_LABOR";
  }
  if (expense.machineId) {
    return "MACHINES_EQUIPMENT";
  }
  if (expense.vehicleId) {
    return "FLEET_TRANSPORT";
  }
  if (expense.toolId || expense.category === "TOOL_PARTS") {
    return "TOOLS_CONSUMABLES";
  }
  if (expense.category === "RENT" || expense.category === "WORKSHOP") {
    return "YARD_FACILITY";
  }
  if (expense.category === "PETTY_CASH") {
    return "PETTY_CASH";
  }
  if (expense.category === "DIESEL") {
    return expense.vehicleId ? "FLEET_TRANSPORT" : "MACHINES_EQUIPMENT";
  }
  if (expense.category === "REPAIR") {
    return expense.vehicleId ? "FLEET_TRANSPORT" : "MACHINES_EQUIPMENT";
  }
  if (expense.category === "TRAVEL") {
    return "FLEET_TRANSPORT";
  }
  return "PETTY_CASH";
}
