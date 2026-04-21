const { spawnSync } = require('child_process')

const { status } = spawnSync('pwd', [], { encoding: 'utf8' })
const rootDir = process.cwd()

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: `${rootDir}/tsconfig.base.json` }],
  },
  testEnvironment: 'node',
  rootDir,
  roots: [`${rootDir}/tests/e2e`],
  moduleNameMapper: {
    '^@logistics/proto(.*)$': `${rootDir}/libs/proto/src$1`,
    '^@logistics/kafka-utils(.*)$': `${rootDir}/libs/kafka-utils/src$1`,
  },
}