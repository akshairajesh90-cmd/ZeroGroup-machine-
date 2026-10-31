/**
 * Database Guard Utility
 * 
 * Prevents seed, test, or verify scripts from modifying production or non-local databases.
 * Rule: Refuses to run unless the DB host is localhost or the database name ends in _test,
 * and NEVER runs when NODE_ENV is production.
 */

export function assertSafeDatabaseContext(scriptName = "Database Script"): void {
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

  try {
    const parsed = new URL(dbUrl);
    const host = (parsed.hostname || "").toLowerCase();
    const pathname = (parsed.pathname || "").toLowerCase();
    const dbName = pathname.replace(/^\//, "");

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
  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith("[CRITICAL DB GUARD]")) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`[CRITICAL DB GUARD] Execution blocked: Invalid DATABASE_URL format in '${scriptName}': ${msg}`);
  }
}
