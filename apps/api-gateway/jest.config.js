module.exports = {
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@logistics/proto(.*)$': '<rootDir>/../../libs/proto/src$1',
    '^@logistics/kafka-utils(.*)$': '<rootDir>/../../libs/kafka-utils/src$1',
  },
  modulePathIgnorePatterns: ['<rootDir>/src/main.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
}