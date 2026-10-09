/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: {
        module: "commonjs",
        esModuleInterop: true,
        paths: {
          "@/*": ["./src/*"]
        }
      }
    }],
  },
  testMatch: [
    "**/testing/**/*.test.ts",
    "**/testing/**/*.test.js",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  reporters: [
    ["default", { verbosity: 2 }],
  ],
  coverageDirectory: "testing/coverage",
};
