// ZERO GROUP — NextAuth v5 Edge-Compatible Config
import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

export const authConfig = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "zero-group-enterprise-secret-key-super-secure-2026",
  pages: {
    signIn: "/",
    error: "/",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.employeeId = user.employeeId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = String(token.id);
        session.user.role = token.role as Role;
        session.user.employeeId = typeof token.employeeId === "string" ? token.employeeId : null;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const pathname = nextUrl.pathname;

      // Protect /admin routes -> OWNER or STAFF role only
      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false; // redirect to /
        if (role !== "OWNER" && role !== "STAFF") {
          return Response.redirect(new URL("/driver/home", nextUrl));
        }
        return true;
      }

      // Protect /driver routes -> DRIVER or OPERATOR (or OWNER/STAFF for testing/support)
      if (pathname.startsWith("/driver")) {
        if (!isLoggedIn) return false; // redirect to /
        if (role !== "DRIVER" && role !== "OPERATOR" && role !== "OWNER" && role !== "STAFF") {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      // If logged in and visiting home (/), redirect based on role
      if (pathname === "/" && isLoggedIn) {
        if (role === "OWNER" || role === "STAFF") {
          return Response.redirect(new URL("/admin/dashboard", nextUrl));
        }
        if (role === "DRIVER" || role === "OPERATOR") {
          return Response.redirect(new URL("/driver/home", nextUrl));
        }
      }

      return true;
    },
  },
  providers: [], // Added in src/lib/auth.ts to keep edge middleware lightweight
} satisfies NextAuthConfig;
