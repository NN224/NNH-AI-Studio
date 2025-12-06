/**
 * Jest configuration for integration tests
 *
 * This config uses node environment and does NOT mock Supabase
 */
module.exports = {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { useESM: true }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/../../$1",
  },
  testTimeout: 120000,
};
