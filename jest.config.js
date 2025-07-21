module.exports = {
  preset: 'ts-jest', // Specifies that ts-jest should be used for TypeScript files
  testEnvironment: 'node', // Defines the environment in which tests run (e.g., 'node' for server-side, 'jsdom' for browser-like)
  // Optional configurations:
  testMatch: [
    '**/__tests__/**/*.ts', // Glob pattern for detecting test files
    '**/?(*.)+(spec|test).ts'
  ],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'], // File extensions Jest should look for
  collectCoverage: true, // Enables code coverage collection
  coverageDirectory: 'coverage', // Directory for coverage reports
  collectCoverageFrom: [
    'src/**/*.ts', // Specifies files from which to collect coverage
    '!src/**/*.d.ts' // Excludes declaration files
  ],
  // You can add more configurations as needed, such as:
  // moduleNameMapper: { // For mapping module paths (e.g., handling aliases)
  //   '^@/(.*)$': '<rootDir>/src/$1',
  // },
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // For setting up the testing environment before each test suite
};