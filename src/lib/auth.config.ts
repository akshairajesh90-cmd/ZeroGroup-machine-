// ZERO GROUP — NextAuth v5 Edge-Compatible Config
import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (!authSecret) {
  throw new Error("AUTH_SECRET or NEXTAUTH_SECRET environment variable is missing. Refusing to start.");
}

export const authConfig = {
  secret: authSecret,
  trustHost: true,
  pages: {
    signIn: "/",
    error: "/",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30 days — keeps Operators logged in through dead zones
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.employeeId = user.employeeId;
        token.sessionTokenVersion = (user as any).sessionTokenVersion || 1;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
        token.operatorType = (user as any).operatorType;
        token.isCrewLeader = (user as any).isCrewLeader || false;
      }
      
      if (trigger === "update" && session?.impersonate) {
        token.isImpersonating = true;
        token.originalAdminId = token.id;
        token.id = session.impersonate.id;
        token.role = session.impersonate.role;
        token.employeeId = session.impersonate.employeeId;
      } else if (trigger === "update" && session?.stopImpersonating && token.isImpersonating) {
        token.isImpersonating = false;
        token.id = token.originalAdminId;
        token.role = "OWNER";
      } else if (trigger === "update" && session?.updateTokenVersion) {
        // When kill switch is activated, we update our local token version to match DB
        token.sessionTokenVersion = (token.sessionTokenVersion as number) + 1;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = String(token.id);
        session.user.role = token.role as Role;
        session.user.employeeId = typeof token.employeeId === "string" ? token.employeeId : null;
        (session.user as any).sessionTokenVersion = token.sessionTokenVersion;
        
        if (token.isImpersonating) {
          (session.user as any).isImpersonating = true;
          (session.user as any).originalAdminId = token.originalAdminId;
        }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
        (session.user as any).operatorType = token.operatorType;
        (session.user as any).isCrewLeader = token.isCrewLeader;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      console.log(`[MIDDLEWARE] Running for ${nextUrl.pathname}. auth:`, JSON.stringify(auth));
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const pathname = nextUrl.pathname;

      // ── NOT LOGGED IN ────────────────────────────────────────────────────────
      if (!isLoggedIn) {
        // Allow public paths without a session
        if (pathname === "/" || pathname === "/operator/login" || pathname.startsWith("/api/")) return true;
        // Everything else requires login
        return false;
      }

      // If arriving at root with an error or logout parameter, stay on root to display message/re-login
      if (pathname === "/" && (nextUrl.searchParams.has("error") || nextUrl.searchParams.has("logout"))) {
        return true;
      }

      // ── GOD MODE UNIVERSAL BYPASS ────────────────────────────────────────────
      // OWNER and ADMIN can go ANYWHERE. No exceptions. Period.
      const isGodMode = role === "OWNER" || role === "ADMIN";
      if (isGodMode) {
        // Only redirect away from the bare root "/" or "/redirecting" to their home
        if (pathname === "/" || pathname === "/redirecting") {
          return Response.redirect(new URL("/admin/dashboard", nextUrl));
        }
        return true;
      }

      // ── LOGGED IN, NON-ADMIN ROLE ─────────────────────────────────────────────

      // Redirect root based on role
      if (pathname === "/" || pathname === "/redirecting") {
        if (role === "STAFF") return Response.redirect(new URL("/staff/dashboard", nextUrl));
        if (role === "OPERATOR") return Response.redirect(new URL("/operator/home", nextUrl));
        return Response.redirect(new URL("/driver/home", nextUrl));
      }

      // Block /admin and /owner from non-admins
      if (pathname.startsWith("/owner") || pathname.startsWith("/admin")) {
        if (role === "STAFF") {
          const allowedAdminPathsForStaff = [
            "/admin/live/map",
            "/admin/billing",
            "/admin/advances",
            "/admin/adjustments"
          ];
          if (allowedAdminPathsForStaff.some(p => pathname.startsWith(p))) {
            return true;
          }
          return Response.redirect(new URL("/staff/dashboard", nextUrl));
        }
        if (role === "OPERATOR") return Response.redirect(new URL("/operator/home", nextUrl));
        return Response.redirect(new URL("/driver/home", nextUrl));
      }

      // /staff → STAFF only
      if (pathname.startsWith("/staff")) {
        if (role === "STAFF") return true;
        return Response.redirect(new URL("/", nextUrl));
      }

      // /driver → DRIVER only
      if (pathname.startsWith("/driver")) {
        if (role === "DRIVER") return true;
        return Response.redirect(new URL("/", nextUrl));
      }

      // /operator → OPERATOR only
      if (pathname.startsWith("/operator")) {
        if (role === "OPERATOR") return true;
        return Response.redirect(new URL("/", nextUrl));
      }

      return true;
    },
  },
  providers: [], // Added in src/lib/auth.ts to keep edge middleware lightweight
} satisfies NextAuthConfig;
