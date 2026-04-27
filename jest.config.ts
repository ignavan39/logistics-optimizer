import { type Config } from 'jest'

const config: Config = {
  displayName: 'root',
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'libs/document-templates/tsconfig.test.json' }],
  },
  moduleNameMapper: {
    '^@logistics/proto(.*)$': '<rootDir>/libs/proto/src$1',
    '^@logistics/kafka-utils(.*)$': '<rootDir>/libs/kafka-utils/src$1',
  },
  testMatch: ['**/tests/**/*.spec.ts', '**/test/**/*.spec.ts', '**/src/**/*.spec.ts'],
  passWithNoTests: true,
}

export default config