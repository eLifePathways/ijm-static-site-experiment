import { defineConfig } from '@playwright/test';

// Runs inside the Dockerfile.vrt container against `astro preview` on the
// host — see the vrt-* targets in the Makefile.
export default defineConfig({
  testDir: './tests',
  snapshotDir: './snapshots',
  outputDir: './test-results',
  snapshotPathTemplate: '{snapshotDir}/{arg}-{projectName}{ext}',
  reporter: [['html', { outputFolder: './html_report', open: 'never' }]],
  use: {
    baseURL: process.env.VRT_BASE_URL ?? 'http://host.docker.internal:4322',
    browserName: 'chromium',
  },
  // One viewport either side of each legacy breakpoint (45.625em, 75em):
  // mobile header; desktop header with inline ToC; sidebar ToC.
  projects: [
    { name: 'mobile', use: { viewport: { width: 375, height: 812 } } },
    { name: 'tablet', use: { viewport: { width: 800, height: 1024 } } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
  ],
});
