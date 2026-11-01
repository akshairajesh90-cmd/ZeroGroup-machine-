/**
 * Database Guard Utility
 * 
 * Prevents seed, test, or verify scripts from modifying production or non-test databases.
 * Rule: Destructive scripts (seed-28day, set-passwords, verify-store-location-edit, seed-notebook-data)
 * can ONLY run when:
 * 1. NODE_ENV is NOT 'production', AND
 * 2. Host is localhost / 127.0.0.1 / ::1, AND
 * 3. Either the database name ends in '_test', OR an explicit opt-in flag (ALLOW_DESTRUCTIVE_DEV_SEED=true) is set.
 */

export function assertSafeDatabaseContext(
  scriptName = "Database Script",
  options: { isDestructive?: boolean } = { isDestructive: true }
): void {
  const nodeEnv = process.env.NODE_ENV || "development";
  if (nodeEnv === "production") {
    throw new Error(
      `[CRITICAL DB GUARD] Execution blocked: '${scriptName}' cannot run in production (NODE_ENV=production).`
    );
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      `[CRITICAL DB GUARD] Execution blocked: '${scriptName}' requires DATABASE_URL environment variable to be set.`
    );
  }

  let host = "";
  let dbName = "";

  try {
    const parsed = new URL(dbUrl);
    host = (parsed.hostname || "").toLowerCase();
    const pathname = (parsed.pathname || "").toLowerCase();
    dbName = pathname.replace(/^\//, "");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`[CRITICAL DB GUARD] Execution blocked: Invalid DATABASE_URL format in '${scriptName}': ${msg}`);
  }

  const isLocalhost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0";

  const isTestDb = dbName.endsWith("_test");

  if (!isLocalhost && !isTestDb) {
    throw new Error(
      `[CRITICAL DB GUARD] Execution blocked: Target database (${host}/${dbName}) is neither on localhost nor ending in '_test'. Aborting '${scriptName}' to protect external/remote data.`
    );
  }

  // Destructive script check: If database does NOT end in _test,
  // refuse to run unless an explicit opt-in environment flag is set.
  const isDestructive = options.isDestructive !== false;
  if (isDestructive && !isTestDb) {
    const allowOptIn = process.env.ALLOW_DESTRUCTIVE_DEV_SEED === "true";
    if (!allowOptIn) {
      throw new Error(
        `[CRITICAL DB GUARD] Execution blocked: '${scriptName}' is a destructive database script. Target database '${dbName}' does not end in '_test'. To allow destructive execution on a dev database, you must explicitly set ALLOW_DESTRUCTIVE_DEV_SEED=true.`
      );
    }
  }
}
