"use server";

import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";

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

    console.log(`[AUTH] Attempting to sign in with email: ${email}`);
    await signIn("credentials", {
      email,
      password,
      redirect: true,
      redirectTo: "/",
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
  await signOut({ redirectTo: "/" });
}
