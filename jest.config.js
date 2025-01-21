module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/data/**/*.{ts,tsx}',
    '!src/data/**/*.d.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/data/__tests__/setup.ts']
};