/**
 * Merge generated/ into dist/ after `astro build` completes.
 *
 * generated/images/{id}/*.jpg  →  dist/images/{id}/*.jpg
 * generated/files/{id}/*.pdf   →  dist/files/{id}/*.pdf
 *
 * This two-step approach avoids putting the 1,400+ image files in public/,
 * which would exhaust the OS file descriptor limit during Astro's build-time
 * public-dir scan.
 *
 * Wired as: postbuild
 */

import { readdirSync, mkdirSync, copyFileSync, statSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Generated assets live outside site/ to keep them out of Rolldown's scan
const GENERATED_DIR = resolve(__dirname, '../../generated');
const DIST_DIR = resolve(__dirname, '../dist');

if (!existsSync(GENERATED_DIR)) {
  console.log('No generated/ directory found — nothing to copy.\n');
  process.exit(0);
}

let copied = 0;

function copyTree(src, dest) {
  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(destPath, { recursive: true });
      copyTree(srcPath, destPath);
    } else {
      mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(srcPath, destPath);
      copied++;
    }
  }
}

console.log('\nCopying generated assets to dist/...');
copyTree(GENERATED_DIR, DIST_DIR);
console.log(`Done: ${copied} files copied to dist/.\n`);
