// NextAuth v5 configuration - ZERO GROUP
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email },
            include: { employee: true },
          });
        } catch (dbError) {
          console.error("❌ Database connection failed inside authorize():", dbError);
          throw new Error("Could not connect to database. Check if PostgreSQL is running and DATABASE_URL in .env is correct.");
        }

        if (!user || !user.hashedPassword) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isValid) {
          return null;
        }

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
