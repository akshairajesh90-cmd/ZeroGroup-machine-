import { prisma } from "../src/lib/prisma";
import { Role, CrewRole, DocumentType, DocumentStatus, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Adding standard demo users and ensuring all aliases exist...");
  const HASH = bcrypt.hashSync("password123", 10);
  const ADMIN_HASH = bcrypt.hashSync("admin123", 10);

  const demoAccounts = [
    {
      email: "owner@zerogroup.com",
      name: "Owner Admin",
      role: Role.OWNER,
      phone: "9847000098",
      hash: ADMIN_HASH,
      wage: 0,
      capableRoles: [] as CrewRole[],
    },
    {
      email: "admin@zerogroup.com",
      name: "Zero Group Admin",
      role: Role.ADMIN,
      phone: "9847000099",
      hash: ADMIN_HASH,
      wage: 0,
      capableRoles: [] as CrewRole[],
    },
    {
      email: "staff@zerogroup.com",
      name: "Office Staff",
      role: Role.STAFF,
      phone: "9847000097",
      hash: HASH,
      wage: 0,
      capableRoles: [] as CrewRole[],
    },
    {
      email: "driver@zerogroup.com",
      name: "Fleet Driver Demo",
      role: Role.DRIVER,
      phone: "9847000096",
      hash: HASH,
      wage: 900,
      capableRoles: [CrewRole.DRIVER],
    },
    {
      email: "operator@zerogroup.com",
      name: "Mixer Operator Demo",
      role: Role.OPERATOR,
      phone: "9847000095",
      hash: HASH,
      wage: 1200,
      capableRoles: [CrewRole.MIXER_OPERATOR, CrewRole.LIFT_OPERATOR, CrewRole.VIBRATOR_OPERATOR],
    },
  ];

  for (const acc of demoAccounts) {
    const existing = await prisma.user.findUnique({
      where: { email: acc.email },
      include: { employee: true },
    });

    if (!existing) {
      const u = await prisma.user.create({
        data: {
          email: acc.email,
          hashedPassword: acc.hash,
          role: acc.role,
        },
      });

      const e = await prisma.employee.create({
        data: {
          name: acc.name,
          role: acc.role,
          userId: u.id,
          phone: acc.phone,
          gpayNumber: acc.phone,
          upiId: `${acc.phone}@okaxis`,
          baseDailyWage: acc.wage,
          lastSeenAt: new Date(),
          lastLatitude: new Prisma.Decimal(9.4981),
          lastLongitude: new Prisma.Decimal(76.3388),
          lastLocationUpdate: new Date(),
          lastSyncStatus: "ONLINE",
          capableRoles: acc.capableRoles,
        },
      });

      for (const cr of acc.capableRoles) {
        await prisma.employeeRoleRate.create({
          data: {
            employeeId: e.id,
            crewRole: cr,
            wagePerDay: acc.wage,
          },
        });
      }

      await prisma.employeeDocument.create({
        data: {
          employeeId: e.id,
          type: acc.role === Role.DRIVER ? DocumentType.LICENSE : DocumentType.ID_PROOF,
          documentNumber: `KL-${acc.role.slice(0, 3)}-${acc.phone.slice(-4)}`,
          issueDate: new Date("2024-01-15"),
          expiryDate: new Date("2029-01-15"),
          attachmentUrl: "/documents/sample-id-proof.pdf",
          status: DocumentStatus.ACTIVE,
        },
      });

      console.log(` Created user: ${acc.email} (${acc.role})`);
    } else {
      console.log(` User already exists: ${acc.email}`);
    }
  }

  await prisma.$disconnect();
  console.log("All demo users seeded successfully!");
}

main().catch(err => {
  console.error("Error seeding demo users:", err);
  process.exit(1);
});
