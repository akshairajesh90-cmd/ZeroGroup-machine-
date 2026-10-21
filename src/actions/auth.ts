"use server";

import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";
import { headers } from "next/headers";

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    if (!email || !password) {
      return "Please enter both email and password.";
    }

    // Dynamically align AUTH_URL / NEXTAUTH_URL to the real incoming host (never localhost on deployment)
    const reqHeaders = headers();
    const host = reqHeaders.get("x-forwarded-host") || reqHeaders.get("host") || "";
    const proto = reqHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");

    if (host && !host.includes("localhost")) {
      const dynamicOrigin = `${proto}://${host}`;
      process.env.AUTH_URL = dynamicOrigin;
      process.env.NEXTAUTH_URL = dynamicOrigin;
    }

    console.log(`[AUTH] Attempting to sign in with email: ${email} on host: ${host}`);
    await signIn("credentials", {
      email,
      password,
      redirect: true,
      redirectTo: "/redirecting",
    });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).includes("NEXT_REDIRECT")) {
      console.log(`[AUTH] Successfully signed in and redirecting ${email}`);
      throw error;
    }
    if (error instanceof AuthError) {
      console.error("[AUTH] AuthError caught:", error.type, error.cause);
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid email or password.";
        case "CallbackRouteError": {
          const causeMsg = (error.cause as any)?.err?.message || (error.cause as any)?.message || error.message;
          if (causeMsg && causeMsg.includes("Could not connect to database")) {
            return `Database connection failed. Make sure your PostgreSQL database is running.`;
          }
          return "Invalid email or password.";
        }
        default: {
          const causeMsg = (error.cause as any)?.err?.message || error.message;
          return `Authentication failed (${error.type}): ${causeMsg || "Please check your database and credentials."}`;
        }
      }
    }
    // Next.js redirect errors and other system errors should be rethrown
    console.error(`[AUTH] Unknown error for ${email}:`, error);
    throw error;
  }
}

export async function handleSignOut() {
  const reqHeaders = headers();
  const host = reqHeaders.get("x-forwarded-host") || reqHeaders.get("host") || "";
  const proto = reqHeaders.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  if (host && !host.includes("localhost")) {
    const dynamicOrigin = `${proto}://${host}`;
    process.env.AUTH_URL = dynamicOrigin;
    process.env.NEXTAUTH_URL = dynamicOrigin;
  }
  await signOut({ redirectTo: "/" });
}
