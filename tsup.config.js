import { defineConfig } from 'tsup'

const defaultConfig = {
  sourcemap: true,
  clean: true,
  format: ['cjs', 'esm'],
}

const DEV = {
  ...defaultConfig,
  entry: {
    'index.dev': 'src/index.ts',
  },
  define: {
    __DEV__: 'true',
  },
}

const PROD = {
  ...defaultConfig,
  entry: {
    'index.prod': 'src/index.ts',
  },
  define: {
    __DEV__: 'false',
  },
}
export default defineConfig([
  {
    ...DEV,
    format: 'esm',
  },
  {
    ...DEV,
    format: 'cjs',
  },
  {
    ...PROD,
    format: 'esm',
    dts: true,
  },
  {
    ...PROD,
    format: 'cjs',
  },
])