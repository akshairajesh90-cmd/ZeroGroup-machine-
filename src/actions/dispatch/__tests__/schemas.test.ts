import {
  dispatchSchema,
  updateStatusSchema,
  reportIncidentSchema,
  finalizeScopeSchema,
  updateDailyDispatchSchema,
} from "../schemas";

describe("Dispatch Zod Schemas", () => {
  describe("dispatchSchema", () => {
    it("validates a standard dispatch payload with defaults", () => {
      const payload = {
        customerId: "cust-01",
        location: "Kakkanad InfoPark Phase 2, Kochi",
        dateOfService: "2026-03-10",
      };
      const result = dispatchSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.workType).toBe("NORMAL");
        expect(result.data.liftFloors).toBe(1);
        expect(result.data.mixerCategory).toBe("STANDARD");
        expect(result.data.helperCount).toBe(0);
        expect(result.data.hasTrollyBench).toBe(false);
      }
    });

    it("validates a heavy plant dispatch with tools, off-road coordinates, and trolley workers", () => {
      const payload = {
        customerId: "cust-99",
        machineId: "mach-10-7",
        machineIds: ["mach-10-7", "mach-vibrator-01"],
        driverId: "drv-01",
        operatorId: "op-01",
        helperCount: 3,
        trollyWorkerCount: 2,
        location: "Aluva Highway Flyover Project",
        accessLatitude: 10.1076,
        accessLongitude: 76.3516,
        isOffRoad: true,
        offRoadDistanceM: 150,
        dateOfService: "2026-03-12",
        workType: "TROLLY",
        liftFloors: 4,
        mixerCategory: "HYDRAULIC",
        toolIds: ["tool-pipe-1", "tool-cable-1"],
        toolItems: [
          { toolId: "tool-pipe-1", quantity: 5, variant: "2-inch" }
        ],
      };
      const result = dispatchSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("rejects empty customerId or empty location", () => {
      const invalid = {
        customerId: "",
        location: "",
        dateOfService: "2026-03-10",
      };
      const result = dispatchSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("updateStatusSchema", () => {
    it("accepts valid status transitions", () => {
      const validStatuses = [
        "PENDING", "EN_ROUTE", "IN_PROGRESS", "DELIVERED",
        "PICKED_UP", "COMPLETED", "CANCELLED", "POSTPONED"
      ];
      for (const status of validStatuses) {
        const result = updateStatusSchema.safeParse({
          dispatchId: "disp-101",
          status,
          reason: "Routine operational update",
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid status", () => {
      const result = updateStatusSchema.safeParse({
        dispatchId: "disp-101",
        status: "NON_EXISTENT_STATUS",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("reportIncidentSchema", () => {
    it("validates detailed conflict and incident report", () => {
      const valid = {
        dispatchId: "disp-202",
        conflictReport: "Customer site delayed power connection by 3 hours; hydraulic skip paused.",
      };
      expect(reportIncidentSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects overly short incident report", () => {
      const invalid = {
        dispatchId: "disp-202",
        conflictReport: "No",
      };
      expect(reportIncidentSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe("finalizeScopeSchema & updateDailyDispatchSchema", () => {
    it("validates closing scope with audit notes", () => {
      const valid = {
        dispatchId: "disp-303",
        finalWorkType: "TROLLY",
        closingNotes: "Pani finished late at 8 PM - extra 3 hours overtime logged",
      };
      expect(finalizeScopeSchema.safeParse(valid).success).toBe(true);
    });

    it("validates full daily dispatch update with crew assignments", () => {
      const valid = {
        id: "disp-404",
        version: 2,
        customerId: "cust-12",
        location: "Edappally Toll Junction",
        dateOfService: "2026-03-15",
        crewAssignments: [
          { employeeId: "emp-1", assignedRole: "MIXER_OPERATOR", lockedWageRate: 850 },
        ],
      };
      expect(updateDailyDispatchSchema.safeParse(valid).success).toBe(true);
    });
  });
});
