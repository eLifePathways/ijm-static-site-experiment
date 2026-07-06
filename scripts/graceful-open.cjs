/**
 * Preload module: patches fs.promises.open to retry on EMFILE.
 * This is what graceful-fs does, but applied directly so no extra dependency is needed.
 * Load via: NODE_OPTIONS="--require ./scripts/graceful-open.cjs"
 */
'use strict';

const fs = require('fs');
const { open: origOpen } = fs.promises;

const RETRY_DELAY = 25;   // ms between retries
const MAX_RETRIES = 1000; // give up after ~25s

async function retryOpen(path, flags, mode) {
  let retries = 0;
  while (true) {
    try {
      return mode !== undefined
        ? await origOpen(path, flags, mode)
        : await origOpen(path, flags);
    } catch (err) {
      if (err.code === 'EMFILE' && retries < MAX_RETRIES) {
        retries++;
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
      } else {
        throw err;
      }
    }
  }
}

// Wrap with the right arity to match the originals
fs.promises.open = function open(path, flags, mode) {
  return retryOpen(path, flags, mode);
};
