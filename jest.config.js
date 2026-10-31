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
    "**/testing/**/*.test.[jt]s?(x)",
    "**/tests/**/*.test.[jt]s?(x)",
    "**/src/**/__tests__/**/*.test.[jt]s?(x)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  reporters: [
    ["default", { verbosity: 2 }],
  ],
  coverageDirectory: "testing/coverage",
};
