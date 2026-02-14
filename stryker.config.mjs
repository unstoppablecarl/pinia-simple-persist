// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  _comment:
    'This config was generated using \'stryker init\'. Please see the guide for more information: https://stryker-mutator.io/docs/stryker-js/guides/vuejs',
  testRunner: 'vitest',
  plugins: [
    '@stryker-mutator/vitest-runner',
    '@stryker-mutator/typescript-checker',
  ],
  reporters: ['progress', 'clear-text', 'html'],
  mutate: ['src/**/*'],
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  typescriptChecker: {
    'prioritizePerformanceOverAccuracy': true,
  },
}
export default config
