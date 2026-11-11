import { z } from "zod";

/**
 * Enterprise Runtime Environment Variable Validator
 * Enforces production configuration boundaries without leaking secrets.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),
  AUTH_SECRET: z.string().min(1).optional(),
  NEXTAUTH_SECRET: z.string().min(1).optional(),
  AUTH_URL: z.string().optional(),
  NEXTAUTH_URL: z.string().optional(),
  MAX_STAFF_ADJUSTMENT_LIMIT: z.coerce.number().positive().default(500),

  // Storage (Supabase)
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // SMS Gateway Integrations
  SIM_GATEWAY_LOGIN: z.string().optional(),
  SIM_GATEWAY_PASSWORD: z.string().optional(),
  TEXTBEE_API_KEY: z.string().optional(),
  TEXTBEE_DEVICE_ID: z.string().optional(),
  FAST2SMS_API_KEY: z.string().optional(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cachedEnv: ServerEnv | null = null;

export function getEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errorFormatted = result.error.format();
    console.error("❌ [ENV GUARD] Environment validation failed:", errorFormatted);
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
      throw new Error("[ENV GUARD] Invalid server environment configuration for production.");
    }
    // Return partial fallback in dev to prevent hard crashes during build initialization
    return (result as any).data || (process.env as any);
  }

  // Ensure either AUTH_SECRET or NEXTAUTH_SECRET is available
  const hasSecret = Boolean(result.data.AUTH_SECRET || result.data.NEXTAUTH_SECRET);
  if (!hasSecret && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
    throw new Error("[ENV GUARD] Either AUTH_SECRET or NEXTAUTH_SECRET must be defined in production.");
  }

  cachedEnv = result.data;
  return cachedEnv;
}

export function _resetEnvCacheForTesting(): void {
  cachedEnv = null;
}
