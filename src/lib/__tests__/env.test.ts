import { getEnv, _resetEnvCacheForTesting } from "../env";

describe("Runtime Environment Validator (env.ts)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    _resetEnvCacheForTesting();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns parsed environment in development or test", () => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/project7_test";
    process.env.AUTH_SECRET = "super-secret-auth-key-1234567890";
    (process.env as any).NODE_ENV = "test";

    const env = getEnv();
    expect(env).toBeDefined();
    expect(env.DATABASE_URL).toBe("postgresql://postgres:postgres@localhost:5432/project7_test");
    expect(env.MAX_STAFF_ADJUSTMENT_LIMIT).toBe(500);
  });

  it("handles custom MAX_STAFF_ADJUSTMENT_LIMIT coercion", () => {
    process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/project7_test";
    process.env.AUTH_SECRET = "secret";
    process.env.MAX_STAFF_ADJUSTMENT_LIMIT = "1500";

    const env = getEnv();
    expect(env.MAX_STAFF_ADJUSTMENT_LIMIT).toBe(1500);
  });
});
