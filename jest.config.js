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
  testMatch: ["<rootDir>/test/**/*.test.ts"],
  testTimeout: 60000,
};
