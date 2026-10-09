/**
 * IronRent ERP - Intelligent Data Seeder
 * Populates realistic construction equipment rental data.
 */

// 1. STRICT KILL SWITCH: Never run this in production!
if (process.env.NODE_ENV === "production") {
  console.error("❌ CRITICAL: Attempted to run seed in production! Exiting.");
  process.exit(1);
}

import "dotenv/config";
import { Role, MachineType, VehicleStatus, MachineStatus, WorkType, DispatchStatus } from "@prisma/client";
import { startOfDay } from "date-fns";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🧹 Wiping existing database...");
  await prisma.$transaction([
    prisma.paymentRecord.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.paymentReceipt.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.cashCollection.deleteMany(),
    prisma.settlement.deleteMany(),
    prisma.manualAdjustment.deleteMany(),
    prisma.salaryAdvance.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.shiftLog.deleteMany(),
    prisma.fuelLog.deleteMany(),
    prisma.maintenanceTicket.deleteMany(),
    prisma.employeeDocument.deleteMany(),
    prisma.vehicleDocument.deleteMany(),
    prisma.dispatchStatusHistory.deleteMany(),
    prisma.dispatchAssignment.deleteMany(),
    prisma.dispatchLabor.deleteMany(),
    prisma.dispatchTool.deleteMany(),
    prisma.dispatchAsset.deleteMany(),
    prisma.dispatchMachine.deleteMany(),
    prisma.dispatchAssignment.deleteMany(),
    prisma.dailyDispatch.deleteMany(),
    prisma.project.deleteMany(),
    prisma.workTypeRate.deleteMany(),
    prisma.vehicle.deleteMany(),
    prisma.tool.deleteMany(),
    prisma.machine.deleteMany(),
    prisma.employee.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log("🌱 Database wiped. Starting intelligent seed...");

  // 1. Create Users & Employees
  const createUser = async (name: string, email: string, role: Role) => {
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword: "$2b$10$Q76.qD9D3aFy0L95Wp/NoOeWA3kiyAOSXkdXjBpJAVK1Q4w0VyLDC", // password123
        role
      }
    });
    return prisma.employee.create({
      data: {
        name,
        role,
        userId: user.id
      }
    });
  };

  const owner = await createUser("Admin Owner", "owner@ironrent.test", Role.OWNER);
  const staff = await createUser("Office Manager", "staff@ironrent.test", Role.STAFF);
  
  const driver = await createUser("Ramesh Driver", "driver@ironrent.test", Role.DRIVER);
  const operator = await createUser("Babu Operator", "operator@ironrent.test", Role.OPERATOR);

  // 2. Create Project
  const project = await prisma.project.create({
    data: {
      name: "Pala Highway Roadwork",
      location: "Pala, Kerala",
      startDate: new Date("2026-08-01"),
      status: "ACTIVE"
    }
  });

  // 3. Create Tools
  const shovel = await prisma.tool.create({
    data: {
      toolId: "SHAWAL-001",
      name: "Shawal (Shovel)",
      toolType: "SHAWAL",
      totalInventory: 15,
      status: "AVAILABLE"
    }
  });

  const basket = await prisma.tool.create({
    data: {
      toolId: "KOTTA-001",
      name: "Kotta (Basket)",
      toolType: "KOTTA",
      totalInventory: 20,
      status: "AVAILABLE"
    }
  });

  // 4. Create Vehicle
  const vehicle = await prisma.vehicle.create({
    data: {
      licensePlate: "KL-01-AB-1234",
      type: "Flatbed Truck",
      status: VehicleStatus.AVAILABLE
    }
  });

  // 5. Create Vehicle Documents
  await prisma.vehicleDocument.create({
    data: {
      vehicleId: vehicle.id,
      type: "RC",
      documentNumber: "RC-KL01-99999",
      issueDate: new Date("2025-08-16"),
      expiryDate: new Date("2028-08-16"), // Valid
      attachmentUrl: "https://example.com/rc.pdf",
      status: "ACTIVE"
    }
  });

  await prisma.vehicleDocument.create({
    data: {
      vehicleId: vehicle.id,
      type: "INSURANCE",
      documentNumber: "INS-KL01-88888",
      issueDate: new Date("2024-07-01"),
      expiryDate: new Date("2026-07-01"), // Expired
      attachmentUrl: "https://example.com/insurance.pdf",
      status: "EXPIRED"
    }
  });

  // 6. Create Employee Documents
  await prisma.employeeDocument.create({
    data: {
      employeeId: driver.id,
      type: "LICENSE",
      documentNumber: "DL-9876543210",
      issueDate: new Date("2020-01-01"),
      expiryDate: new Date("2030-01-01"), // Valid
      attachmentUrl: "https://example.com/license.pdf",
      status: "ACTIVE"
    }
  });

  await prisma.employeeDocument.create({
    data: {
      employeeId: operator.id,
      type: "ID_PROOF",
      documentNumber: "AADHAAR-11112222",
      issueDate: new Date("2015-01-01"),
      expiryDate: new Date("2025-01-01"), // Expired
      attachmentUrl: "https://example.com/id.pdf",
      status: "EXPIRED"
    }
  });

  // 7. Create Customer
  const customer = await prisma.customer.create({
    data: {
      name: "Sobha Developers",
      phone: "8000000002",
      address: "North Zone"
    }
  });

  // 8. Create Daily Dispatch linking everything together
  const dispatch = await prisma.dailyDispatch.create({
    data: {
      customerId: customer.id,
      projectId: project.id,
      driverId: driver.id,
      operatorId: operator.id,
      location: "Pala Highway Roadwork Site",
      dateOfService: new Date("2026-08-16"),
      status: DispatchStatus.COMPLETED,
      workType: WorkType.NORMAL,
      customerCharge: 6000.00,
      operatorDailyRate: 1200.00,
      helperCount: 3,
      version: 1,
    }
  });

  // 9. Link Tools to Dispatch
  await prisma.dispatchTool.create({
    data: {
      dispatchId: dispatch.id,
      toolId: shovel.id,
      quantity: 5
    }
  });

  await prisma.dispatchTool.create({
    data: {
      dispatchId: dispatch.id,
      toolId: basket.id,
      quantity: 8
    }
  });

  // 10. Create Driver Shift Log linking Employee and Vehicle
  await prisma.shiftLog.create({
    data: {
      driverId: driver.id,
      vehicleId: vehicle.id,
      date: new Date("2026-08-16"),
      startTime: new Date("2026-08-16T08:00:00Z"),
      endTime: new Date("2026-08-16T17:00:00Z")
    }
  });

  console.log("✅ Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
