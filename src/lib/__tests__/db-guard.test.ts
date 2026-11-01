import { assertSafeDatabaseContext } from "../db-guard";

describe("Database Guard (assertSafeDatabaseContext)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.ALLOW_DESTRUCTIVE_DEV_SEED;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("throws error when NODE_ENV is production, even with opt-in flag", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://postgres:pass@localhost:5432/my_test";
    process.env.ALLOW_DESTRUCTIVE_DEV_SEED = "true";

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

  it("BLOCKS destructive script on localhost/postgres without explicit opt-in flag", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.DATABASE_URL = "postgresql://postgres:pass@localhost:5432/postgres?schema=public";
    delete process.env.ALLOW_DESTRUCTIVE_DEV_SEED;

    expect(() => assertSafeDatabaseContext("destructive-seed")).toThrow(
      /destructive database script.*does not end in '_test'.*ALLOW_DESTRUCTIVE_DEV_SEED=true/i
    );
  });

  it("ALLOWS destructive script on localhost/postgres when ALLOW_DESTRUCTIVE_DEV_SEED=true is set", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.DATABASE_URL = "postgresql://postgres:pass@localhost:5432/postgres?schema=public";
    process.env.ALLOW_DESTRUCTIVE_DEV_SEED = "true";

    expect(() => assertSafeDatabaseContext("destructive-seed")).not.toThrow();
  });

  it("ALLOWS destructive script when database name ends in _test without any opt-in flag", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.DATABASE_URL = "postgresql://postgres:pass@localhost:5432/project7_test?schema=public";
    delete process.env.ALLOW_DESTRUCTIVE_DEV_SEED;

    expect(() => assertSafeDatabaseContext("destructive-seed")).not.toThrow();
  });

  it("ALLOWS non-destructive script on localhost/postgres without opt-in flag", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.DATABASE_URL = "postgresql://postgres:pass@localhost:5432/postgres?schema=public";
    delete process.env.ALLOW_DESTRUCTIVE_DEV_SEED;

    expect(() =>
      assertSafeDatabaseContext("readonly-script", { isDestructive: false })
    ).not.toThrow();
  });
});

import { validateTestDatabaseUrl } from "../../../scripts/seed-test-db";

describe("Strict Test Database URL Validator (validateTestDatabaseUrl)", () => {
  it("throws when DATABASE_URL is undefined or empty", () => {
    expect(() => validateTestDatabaseUrl(undefined)).toThrow(/missing or empty/i);
    expect(() => validateTestDatabaseUrl("")).toThrow(/missing or empty/i);
  });

  it("throws when target database does not end in _test", () => {
    expect(() =>
      validateTestDatabaseUrl("postgresql://postgres:pass@localhost:5432/postgres")
    ).toThrow(/must target a database ending in "_test"/i);

    expect(() =>
      validateTestDatabaseUrl("postgresql://postgres:pass@localhost:5432/project7")
    ).toThrow(/must target a database ending in "_test"/i);

    expect(() =>
      validateTestDatabaseUrl("postgresql://postgres:pass@localhost:5432/project7_testing")
    ).toThrow(/must target a database ending in "_test"/i);
  });

  it("accepts valid test database URLs ending in _test (with or without query params)", () => {
    expect(
      validateTestDatabaseUrl("postgresql://postgres:pass@localhost:5432/project7_test")
    ).toBe("project7_test");

    expect(
      validateTestDatabaseUrl("postgresql://postgres:pass@localhost:5432/project7_test?schema=public")
    ).toBe("project7_test");
  });
});
