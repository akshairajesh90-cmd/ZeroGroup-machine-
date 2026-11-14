import { getYardLocation, getYardCoordinatesSync, PALA_DEPOT_LATITUDE, PALA_DEPOT_LONGITUDE } from "../yardLocation";
import { prisma } from "@/lib/prisma";
import * as fs from "fs";
import * as path from "path";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    systemSettings: {
      findFirst: jest.fn(),
    },
  },
}));

describe("Centralized Yard Location Provider (getYardLocation)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns canonical Pala Depot coordinates via getYardCoordinatesSync", () => {
    const coords = getYardCoordinatesSync();
    expect(coords.latitude).toBe(9.7118);
    expect(coords.longitude).toBe(76.6853);
    expect(coords.latitude).toBe(PALA_DEPOT_LATITUDE);
    expect(coords.longitude).toBe(PALA_DEPOT_LONGITUDE);
  });

  it("reads custom yard coordinates from SystemSettings when configured", async () => {
    (prisma.systemSettings.findFirst as jest.Mock).mockResolvedValue({
      storeLatitude: 9.7150,
      storeLongitude: 76.6900,
    });

    const result = await getYardLocation();
    expect(result).toEqual({
      latitude: 9.715,
      longitude: 76.69,
      source: "DATABASE",
    });
  });

  it("falls back to canonical Pala Depot when SystemSettings has null coordinates", async () => {
    (prisma.systemSettings.findFirst as jest.Mock).mockResolvedValue({
      storeLatitude: null,
      storeLongitude: null,
    });

    const result = await getYardLocation();
    expect(result).toEqual({
      latitude: 9.7118,
      longitude: 76.6853,
      source: "DEFAULT_PALA_DEPOT",
    });
  });

  it("falls back to canonical Pala Depot when database query fails", async () => {
    (prisma.systemSettings.findFirst as jest.Mock).mockRejectedValue(new Error("DB connection timeout"));

    const result = await getYardLocation();
    expect(result).toEqual({
      latitude: 9.7118,
      longitude: 76.6853,
      source: "DEFAULT_PALA_DEPOT",
    });
  });

  describe("Depot Coordinate Literal AST / Source Code Scan", () => {
    function getAllSourceFiles(dir: string, fileList: string[] = []): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "node_modules" && entry.name !== ".next" && entry.name !== "__tests__") {
            getAllSourceFiles(fullPath, fileList);
          }
        } else if (
          (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
          !entry.name.endsWith(".test.ts") &&
          !entry.name.endsWith(".test.tsx") &&
          !entry.name.endsWith(".spec.ts")
        ) {
          fileList.push(fullPath);
        }
      }
      return fileList;
    }

    it("verifies that NO source file outside yardCoordinates.ts hardcodes depot coordinates", () => {
      const srcDir = path.resolve(__dirname, "../../..");
      const files = getAllSourceFiles(srcDir);
      
      const FORBIDDEN_LITERALS = [
        "9.7118",
        "76.6853",
        "9.5916",
        "76.5222",
      ];

      const violations: { file: string; line: number; literal: string; text: string }[] = [];

      for (const filePath of files) {
        // Exclude the canonical definitions themselves
        if (filePath.endsWith("yardCoordinates.ts") || filePath.endsWith("yardLocation.ts")) {
          continue;
        }

        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n");

        lines.forEach((lineText, idx) => {
          // Ignore comments
          const trimmed = lineText.trim();
          if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
            return;
          }

          for (const literal of FORBIDDEN_LITERALS) {
            if (lineText.includes(literal)) {
              violations.push({
                file: path.relative(srcDir, filePath),
                line: idx + 1,
                literal,
                text: trimmed,
              });
            }
          }
        });
      }

      if (violations.length > 0) {
        const formatted = violations
          .map((v) => `  - ${v.file}:${v.line} matches literal '${v.literal}': "${v.text}"`)
          .join("\n");
        throw new Error(
          `Found ${violations.length} hardcoded depot coordinate literal(s) outside yardCoordinates.ts!\n` +
          `All depot references must import from @/lib/gis/yardLocation or @/lib/gis/yardCoordinates.\n` +
          formatted
        );
      }

      expect(violations).toHaveLength(0);
    });
  });
});
