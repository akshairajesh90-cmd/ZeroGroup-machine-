"use server";

import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return "Please enter both email and password.";
    }

    await signIn("credentials", {
      email,
      password,
      redirect: true,
      redirectTo: "/admin/fleet",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      console.error("AuthError caught:", error.type, error.cause);
      switch (error.type) {
        case "CredentialsSignin":
          return `Invalid email or password. Debug: ${error.cause?.err?.message || error.message}`;
        default:
          return `Authentication failed (${error.type}). Make sure your database is running and migrated.`;
      }
    }
    // If it's a redirect error thrown by Next.js/NextAuth on successful login, rethrow it so redirect works!
    if (error && typeof error === "object" && "digest" in error && String(error.digest).includes("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Unexpected login error:", error);
    return `Server or Database Error: ${error instanceof Error ? error.message : "Unknown error"}. Check if DATABASE_URL is correct in .env`;
  }
}

export async function handleSignOut() {
  await signOut({ redirectTo: "/" });
}
