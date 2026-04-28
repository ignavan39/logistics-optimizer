const path = require('path')

const rootDir = process.env.IN_DOCKER 
  ? '/app' 
  : process.cwd()

module.exports = {
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { 
      tsconfig: path.resolve(rootDir, 'tests/e2e/tsconfig.json'),
      // Убираем isolatedModules - он включает Babel
      useIsolatedModules: false,
    }],
  },
  testEnvironment: 'node',
  rootDir: rootDir,
  roots: [path.resolve(rootDir, 'tests/e2e')],
  moduleNameMapper: {
    '^@logistics/proto(.*)$': path.resolve(rootDir, 'libs/proto/src$1'),
    '^@logistics/kafka-utils(.*)$': path.resolve(rootDir, 'libs/kafka-utils/src$1'),
  },
  testTimeout: 120000, // 2 минуты для beforeAll с ожиданием сервисов
}