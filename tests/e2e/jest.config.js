const path = require('path')

const rootDir = process.env.IN_DOCKER 
  ? '/app' 
  : process.cwd()

module.exports = {
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { 
      tsconfig: path.resolve(rootDir, 'tests/e2e/tsconfig.json'),
      isolatedModules: true 
    }],
  },
  testEnvironment: 'node',
  rootDir: rootDir,
  roots: [path.resolve(rootDir, 'tests/e2e')],
  moduleNameMapper: {
    '^@logistics/proto(.*)$': path.resolve(rootDir, 'libs/proto/src$1'),
    '^@logistics/kafka-utils(.*)$': path.resolve(rootDir, 'libs/kafka-utils/src$1'),
  },
  testTimeout: 30000,
}