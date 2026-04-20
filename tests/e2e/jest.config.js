module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '../../apps/fleet-service/tsconfig.json' }],
  },
  testEnvironment: 'node',
  rootDir: '../..',
  roots: ['<rootDir>/tests/e2e'],
}