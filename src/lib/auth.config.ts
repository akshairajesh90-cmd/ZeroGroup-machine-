// ZERO GROUP — NextAuth v5 Edge-Compatible Config
import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

// Normalize AUTH_URL and NEXTAUTH_URL for Vercel and production deployments
if (process.env.VERCEL || process.env.NODE_ENV === "production") {
  const prodHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    "zero-group-machine.vercel.app";
  const prodUrl = `https://${prodHost.replace(/^https?:\/\//, "")}`;

  if (!process.env.AUTH_URL || process.env.AUTH_URL.includes("localhost")) {
    process.env.AUTH_URL = prodUrl;
  }
  if (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.includes("localhost")) {
    process.env.NEXTAUTH_URL = prodUrl;
  }
}

const authSecret =
  (process.env.AUTH_SECRET && process.env.AUTH_SECRET.trim() !== "")
    ? process.env.AUTH_SECRET
    : (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.trim() !== "")
    ? process.env.NEXTAUTH_SECRET
    : "6b5e265634b023c3eee10686920115d65626617b3fea572037c1694816cb1534";

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
        token.email = user.email;
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
        token.sessionTokenVersion = (token.sessionTokenVersion as number) + 1;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = String(token.id);
        if (token.email) {
          session.user.email = String(token.email);
        }
        session.user.role = token.role as Role;
        session.user.employeeId = typeof token.employeeId === "string" ? token.employeeId : null;
        (session.user as any).sessionTokenVersion = token.sessionTokenVersion;
        
        if (token.isImpersonating) {
          (session.user as any).isImpersonating = true;
          (session.user as any).originalAdminId = token.originalAdminId;
        }

        (session.user as any).operatorType = token.operatorType;
        (session.user as any).isCrewLeader = token.isCrewLeader;
      }
      return session;
    },
    authorized({ auth, request }) {
      const nextUrl = request.nextUrl;
      const host =
        request.headers.get("x-forwarded-host") ||
        request.headers.get("host") ||
        nextUrl.host;
      const proto =
        request.headers.get("x-forwarded-proto") ||
        (host.includes("localhost") ? "http" : "https");
      const safeOrigin = `${proto}://${host}`;

      const safeRedirect = (targetPath: string) => {
        return Response.redirect(new URL(targetPath, safeOrigin));
      };

      console.log(`[MIDDLEWARE] Running for ${nextUrl.pathname} on ${safeOrigin}. auth:`, JSON.stringify(auth));
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const pathname = nextUrl.pathname;

      // ── NOT LOGGED IN ────────────────────────────────────────────────────────
      if (!isLoggedIn) {
        // Allow public paths without a session
        if (
          pathname === "/" ||
          pathname === "/operator/login" ||
          pathname.startsWith("/reset-password") ||
          pathname.startsWith("/api/")
        ) {
          return true;
        }
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
          return safeRedirect("/admin/dashboard");
        }
        return true;
      }

      // ── LOGGED IN, NON-ADMIN ROLE ─────────────────────────────────────────────

      // Redirect root or /redirecting based on role
      if (pathname === "/" || pathname === "/redirecting") {
        if (role === "STAFF") return safeRedirect("/staff/dashboard");
        if (role === "OPERATOR") return safeRedirect("/operator/home");
        return safeRedirect("/driver/home");
      }

      // Block /admin and /owner from non-admins
      if (pathname.startsWith("/owner") || pathname.startsWith("/admin")) {
        if (role === "STAFF") {
          const allowedAdminPathsForStaff = [
            "/admin/live/map",
            "/admin/billing",
            "/admin/advances",
            "/admin/adjustments",
          ];
          if (allowedAdminPathsForStaff.some((p) => pathname.startsWith(p))) {
            return true;
          }
          return safeRedirect("/staff/dashboard");
        }
        if (role === "OPERATOR") return safeRedirect("/operator/home");
        return safeRedirect("/driver/home");
      }

      // /staff → STAFF only
      if (pathname.startsWith("/staff")) {
        if (role === "STAFF") return true;
        return safeRedirect("/");
      }

      // /driver → DRIVER only
      if (pathname.startsWith("/driver")) {
        if (role === "DRIVER") return true;
        return safeRedirect("/");
      }

      // /operator → OPERATOR only
      if (pathname.startsWith("/operator")) {
        if (role === "OPERATOR") return true;
        return safeRedirect("/");
      }

      return true;
    },
  },
  providers: [], // Added in src/lib/auth.ts to keep edge middleware lightweight
} satisfies NextAuthConfig;
