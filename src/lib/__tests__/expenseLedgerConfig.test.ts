import {
  MAIN_LEDGER_HEADS,
  getLedgerHeadForExpense,
} from "../expenseLedgerConfig";

describe("Expense Ledger Configuration & Categorizer", () => {
  it("defines all primary ledger heads with valid colorSchemes and subOptions", () => {
    expect(MAIN_LEDGER_HEADS.length).toBeGreaterThanOrEqual(5);

    const keys = MAIN_LEDGER_HEADS.map((h) => h.key);
    expect(keys).toContain("MACHINES_EQUIPMENT");
    expect(keys).toContain("FLEET_TRANSPORT");
    expect(keys).toContain("STAFF_LABOR");
    expect(keys).toContain("TOOLS_CONSUMABLES");
    expect(keys).toContain("YARD_FACILITY");
    expect(keys).toContain("PETTY_CASH");
  });

  describe("getLedgerHeadForExpense mapping logic", () => {
    it("maps staff advances and helper wages to STAFF_LABOR", () => {
      expect(getLedgerHeadForExpense({ category: "STAFF_ADVANCE" })).toBe("STAFF_LABOR");
      expect(getLedgerHeadForExpense({ category: "CONTRACTOR_ADVANCE" })).toBe("STAFF_LABOR");
      expect(getLedgerHeadForExpense({ category: "OUTSIDE_HELPER_WAGE" })).toBe("STAFF_LABOR");
    });

    it("maps machine-linked expenses to MACHINES_EQUIPMENT", () => {
      expect(
        getLedgerHeadForExpense({ category: "DIESEL", machineId: "mach-10-7" })
      ).toBe("MACHINES_EQUIPMENT");
      expect(
        getLedgerHeadForExpense({ category: "REPAIR", machineId: "mach-lift-1" })
      ).toBe("MACHINES_EQUIPMENT");
    });

    it("maps vehicle-linked expenses to FLEET_TRANSPORT", () => {
      expect(
        getLedgerHeadForExpense({ category: "DIESEL", vehicleId: "veh-flatbed-1" })
      ).toBe("FLEET_TRANSPORT");
      expect(
        getLedgerHeadForExpense({ category: "REPAIR", vehicleId: "veh-tata-ace" })
      ).toBe("FLEET_TRANSPORT");
      expect(
        getLedgerHeadForExpense({ category: "TRAVEL" })
      ).toBe("FLEET_TRANSPORT");
    });

    it("maps tools and parts to TOOLS_CONSUMABLES", () => {
      expect(
        getLedgerHeadForExpense({ category: "TOOL_PARTS" })
      ).toBe("TOOLS_CONSUMABLES");
      expect(
        getLedgerHeadForExpense({ category: "REPAIR", toolId: "tool-grease-gun" })
      ).toBe("TOOLS_CONSUMABLES");
    });

    it("maps yard rent and workshop to YARD_FACILITY", () => {
      expect(getLedgerHeadForExpense({ category: "RENT" })).toBe("YARD_FACILITY");
      expect(getLedgerHeadForExpense({ category: "WORKSHOP" })).toBe("YARD_FACILITY");
    });

    it("falls back to PETTY_CASH for miscellaneous expenses", () => {
      expect(getLedgerHeadForExpense({ category: "PETTY_CASH" })).toBe("PETTY_CASH");
      expect(getLedgerHeadForExpense({ category: "UNKNOWN_EXPENSE" })).toBe("PETTY_CASH");
    });
  });
});
