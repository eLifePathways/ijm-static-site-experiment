import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Playwright specs, run in Docker via `make vrt-test`.
    exclude: [...configDefaults.exclude, 'visual-regression/**'],
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
});
