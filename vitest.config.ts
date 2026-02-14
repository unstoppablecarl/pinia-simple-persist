import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  define: {
    __DEV__: true,
  },
  plugins: [],
  test: {
    include: ['tests/**/*.test.ts'],
    setupFiles: [
      fileURLToPath(new URL('./tests/vitest-setup.ts', import.meta.url)),
    ],
    environment: 'happy-dom',
    typecheck: {
      enabled: true,
      tsconfig: 'tsconfig.json',
      include: [
        'tests/**/*.test.ts',
        'readme/**/*.ts',
      ],
    },
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      enabled: true,
      provider: 'v8',
      reporter: ['text', 'lcovonly', 'html'],
      all: true,
      include: ['src/**/*'],
      exclude: ['tests/**/*.ts'],
    },
  },
})
