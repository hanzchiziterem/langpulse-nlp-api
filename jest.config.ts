import { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "./",
  testRegex: ".*\\.(spec|test)\\.ts$",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  moduleFileExtensions: ["ts", "js", "json", "node"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    "!src/**/*.interface.ts",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  moduleDirectories: ["node_modules", "src"],
  clearMocks: true,
  setupFiles: ["<rootDir>/jest.setup.ts"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  };

export default config;
