module.exports = {
  testEnvironment: 'node',
  rootDir: '/app',
  testMatch: ['<rootDir>/**/tests/e2e/**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: './tests/e2e/tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '^@logistics/proto(.*)$': './libs/proto/src$1',
    '^@logistics/kafka-utils(.*)$': './libs/kafka-utils/src$1',
  },
  testTimeout: 30000,
}