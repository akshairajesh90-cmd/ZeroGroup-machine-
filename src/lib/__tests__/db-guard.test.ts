import { assertSafeDatabaseContext } from "../db-guard";

describe("Database Guard (assertSafeDatabaseContext)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("throws error when NODE_ENV is production", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://postgres:pass@localhost:5432/my_test";

    expect(() => assertSafeDatabaseContext("test-script")).toThrow(
      /cannot run in production/i
    );
  });

  it("throws error when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";

    expect(() => assertSafeDatabaseContext("test-script")).toThrow(
      /requires DATABASE_URL/i
    );
  });

  it("throws error when target database is remote and not ending in _test", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.DATABASE_URL = "postgresql://user:pass@db.production-cloud.com:5432/zerogroup_prod";

    expect(() => assertSafeDatabaseContext("test-script")).toThrow(
      /neither on localhost nor ending in '_test'/i
    );
  });

  it("allows execution when DB host is localhost", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.DATABASE_URL = "postgresql://postgres:pass@localhost:5432/postgres?schema=public";

    expect(() => assertSafeDatabaseContext("test-script")).not.toThrow();
  });

  it("allows execution when DB host is 127.0.0.1", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.DATABASE_URL = "postgresql://postgres:pass@127.0.0.1:5432/devdb";

    expect(() => assertSafeDatabaseContext("test-script")).not.toThrow();
  });

  it("allows execution when remote database name ends in _test", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.DATABASE_URL = "postgresql://user:pass@ci-staging-db.internal:5432/staging_test";

    expect(() => assertSafeDatabaseContext("test-script")).not.toThrow();
  });
});
