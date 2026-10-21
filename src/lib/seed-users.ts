import { prisma } from "./prisma";
import bcrypt from "bcryptjs";
import { Role, CrewRole } from "@prisma/client";

export const DEFAULT_ACCOUNTS = [
  {
    email: "admin@zerogroup.com",
    name: "Zero Group Admin",
    phone: "9847000099",
    role: Role.ADMIN,
    password: "admin123",
    employeeCode: "ZG-001",
    capableRoles: [] as CrewRole[],
  },
  {
    email: "akshairajesh07@gmail.com",
    name: "Akshai Rajesh",
    phone: "9847000001",
    role: Role.OWNER,
    password: "admin123",
    employeeCode: "ZG-000",
    capableRoles: [] as CrewRole[],
  },
  {
    email: "owner@zerogroup.com",
    name: "Owner Admin",
    phone: "9847000098",
    role: Role.OWNER,
    password: "admin123",
    employeeCode: "ZG-099",
    capableRoles: [] as CrewRole[],
  },
  {
    email: "staff@zerogroup.com",
    name: "Priya Menon",
    phone: "9847000097",
    role: Role.STAFF,
    password: "password123",
    employeeCode: "ZG-002",
    capableRoles: [] as CrewRole[],
  },
  {
    email: "priya@zerogroup.in",
    name: "Priya Menon",
    phone: "9847000002",
    role: Role.STAFF,
    password: "password123",
    employeeCode: "ZG-003",
    capableRoles: [] as CrewRole[],
  },
  {
    email: "driver@zerogroup.com",
    name: "Suresh Kumar",
    phone: "9847000096",
    role: Role.DRIVER,
    password: "password123",
    employeeCode: "ZG-101",
    capableRoles: [CrewRole.DRIVER],
  },
  {
    email: "suresh@zerogroup.in",
    name: "Suresh Kumar",
    phone: "9847111001",
    role: Role.DRIVER,
    password: "password123",
    employeeCode: "ZG-102",
    capableRoles: [CrewRole.DRIVER],
  },
  {
    email: "operator@zerogroup.com",
    name: "Rajesh Bhai",
    phone: "9847000095",
    role: Role.OPERATOR,
    password: "password123",
    employeeCode: "ZG-134",
    capableRoles: [CrewRole.MIXER_OPERATOR, CrewRole.LIFT_OPERATOR, CrewRole.VIBRATOR_OPERATOR],
  },
  {
    email: "rajesh@zerogroup.in",
    name: "Rajesh Bhai",
    phone: "9847222001",
    role: Role.OPERATOR,
    password: "password123",
    employeeCode: "ZG-135",
    capableRoles: [CrewRole.MIXER_OPERATOR, CrewRole.LIFT_OPERATOR, CrewRole.VIBRATOR_OPERATOR],
  },
];

export async function seedEssentialUsers() {
  console.log("🌱 [SEED] Provisioning essential users into database...");
  const results = [];

  for (const acc of DEFAULT_ACCOUNTS) {
    const hashedPassword = await bcrypt.hash(acc.password, 10);

    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        hashedPassword,
        displayPassword: acc.password,
        role: acc.role,
      },
      create: {
        email: acc.email,
        hashedPassword,
        displayPassword: acc.password,
        role: acc.role,
      },
    });

    // Check if another employee already has this phone number before setting it
    const existingWithPhone = await prisma.employee.findFirst({
      where: { phone: acc.phone, NOT: { userId: user.id } },
    });

    const phoneToSet = existingWithPhone ? null : acc.phone;

    const employee = await prisma.employee.upsert({
      where: { userId: user.id },
      update: {
        name: acc.name,
        ...(phoneToSet ? { phone: phoneToSet } : {}),
        role: acc.role,
        capableRoles: acc.capableRoles,
        employeeCode: acc.employeeCode,
      },
      create: {
        userId: user.id,
        name: acc.name,
        phone: phoneToSet,
        role: acc.role,
        capableRoles: acc.capableRoles,
        employeeCode: acc.employeeCode,
        isIdVerified: true,
      },
    });

    results.push({ email: acc.email, phone: acc.phone, role: acc.role, status: "READY" });
  }

  console.log(`✅ [SEED] Successfully seeded ${results.length} accounts!`);
  return results;
}
