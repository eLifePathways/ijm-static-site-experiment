/**
 * ESM preload: patches fs.openSync and fs.promises.open to retry on EMFILE.
 *
 * Node.js's ESM module loader uses openSync when reading module source files.
 * With a deep import tree (Astro + Vite + Rolldown), many files can be open
 * simultaneously, exhausting the cgroup hard limit of 4096 fds in CI sandboxes.
 *
 * The sync version uses a spin-wait (no async yield possible inside the ESM
 * loader). The async version uses proper async sleeps.
 *
 * Load via: NODE_OPTIONS="--import file:///absolute/path/to/graceful-open.mjs"
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');

const RETRY_DELAY_MS = 20;
const MAX_RETRIES = 500;

// ── Synchronous patch (used by Node.js ESM loader) ───────────────────────────

const origOpenSync = fs.openSync.bind(fs);
fs.openSync = function gracefulOpenSync(path, flags, mode) {
  let retries = 0;
  while (true) {
    try {
      return mode !== undefined ? origOpenSync(path, flags, mode) : origOpenSync(path, flags);
    } catch (err) {
      if (err.code === 'EMFILE' && retries < MAX_RETRIES) {
        retries++;
        // Spin-wait: let other synchronous operations complete and close their fds.
        const end = Date.now() + RETRY_DELAY_MS;
        while (Date.now() < end) { /* busy-wait */ }
      } else {
        throw err;
      }
    }
  }
};

const origReadFileSync = fs.readFileSync.bind(fs);
fs.readFileSync = function gracefulReadFileSync(path, options) {
  let retries = 0;
  while (true) {
    try {
      return origReadFileSync(path, options);
    } catch (err) {
      if (err.code === 'EMFILE' && retries < MAX_RETRIES) {
        retries++;
        const end = Date.now() + RETRY_DELAY_MS;
        while (Date.now() < end) { /* busy-wait */ }
      } else {
        throw err;
      }
    }
  }
};

// ── Asynchronous patch (used by content loaders and Vite) ────────────────────

const origOpen = fs.promises.open.bind(fs.promises);
fs.promises.open = async function gracefulOpen(path, flags, mode) {
  let retries = 0;
  while (true) {
    try {
      return mode !== undefined ? await origOpen(path, flags, mode) : await origOpen(path, flags);
    } catch (err) {
      if (err.code === 'EMFILE' && retries < MAX_RETRIES) {
        retries++;
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      } else {
        throw err;
      }
    }
  }
};

const origReadFile = fs.promises.readFile.bind(fs.promises);
fs.promises.readFile = async function gracefulReadFile(path, options) {
  let retries = 0;
  while (true) {
    try {
      return await origReadFile(path, options);
    } catch (err) {
      if (err.code === 'EMFILE' && retries < MAX_RETRIES) {
        retries++;
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      } else {
        throw err;
      }
    }
  }
};
