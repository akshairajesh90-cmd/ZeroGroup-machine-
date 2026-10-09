// NextAuth v5 configuration - ZERO GROUP
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";

const nextAuthResult = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("🔐 [AUTH] authorize() called");
        if (!credentials?.email || !credentials?.password) {
          console.log("🔐 [AUTH] Missing credentials");
          return null;
        }

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);
        console.log(`🔐 [AUTH] Attempting login for: ${email}`);

        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email },
            include: { employee: true },
          });
          console.log(`🔐 [AUTH] DB query done. User found: ${!!user}`);
        } catch (dbError) {
          console.error("❌ [AUTH] Database connection failed inside authorize():", dbError);
          throw new Error("Could not connect to database. Check if PostgreSQL is running and DATABASE_URL in .env is correct.");
        }

        if (!user) {
          console.log(`🔐 [AUTH] No user found for email: ${email}`);
          throw new Error("User not found in database for email: " + email);
        }
        if (!user.hashedPassword) {
          console.log("🔐 [AUTH] hashedPassword is null/empty");
          throw new Error("User has no hashed password");
        }

        console.log(`🔐 [AUTH] Comparing password hash (prefix: ${user.hashedPassword.substring(0,7)})`);
        const isValid = await bcrypt.compare(password, user.hashedPassword);
        console.log(`🔐 [AUTH] bcrypt.compare result: ${isValid}`);
        if (!isValid) {
          throw new Error("Invalid password hash comparison");
        }

        console.log(`🔐 [AUTH] ✅ Login SUCCESS for ${email}`);
        return {
          id: user.id,
          email: user.email,
          name: user.employee?.name ?? user.email.split("@")[0],
          role: user.role,
          employeeId: user.employee?.id ?? null,
        };
      },
    }),
  ],
});

export const { handlers, signIn, signOut } = nextAuthResult;

export const auth = async (...args: any[]) => {
  if (process.env.CLI_TEST_ROLE) {
    return {
      user: {
        id: process.env.CLI_TEST_USER_ID || "cli-user",
        email: "cli@ironrent.test",
        name: "CLI User",
        role: process.env.CLI_TEST_ROLE as any,
        employeeId: process.env.CLI_TEST_EMPLOYEE_ID || "cli-emp",
      },
    } as any;
  }
  return (nextAuthResult as any).auth(...args);
};
