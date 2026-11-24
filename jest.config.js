// eslint-disable-next-line no-undef
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageReporters: [
    "lcov",
    "text",
    "html"
  ],
  collectCoverageFrom: [
    "src/**/*"
  ],
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  testTimeout: 60000,
  watchPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/tests/migrations/",
    "\\.md$",
    "\\.json$"
  ],
};
