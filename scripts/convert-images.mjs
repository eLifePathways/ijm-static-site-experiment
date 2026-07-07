/**
 * Prepare static assets for the IJM site build:
 *   1. Convert TIFF figures → JPEG  (public/images/{id}/{stem}.jpg)
 *   2. Copy PDFs                    (public/files/{id}/{file}.pdf)
 *
 * Both operations are idempotent: files are skipped when the destination
 * already exists and is newer than the source.
 *
 * Run via:  npm run convert-images
 * Wired as: prebuild (runs automatically before `npm run build`)
 */

import { createRequire } from 'module';
import { readdirSync, mkdirSync, existsSync, statSync, copyFileSync } from 'fs';
import { join, resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const ASSETS_DIR = resolve(__dirname, '../../assets/files');
const IMAGES_DIR = resolve(__dirname, '../public/images');
const FILES_DIR = resolve(__dirname, '../public/files');
const JPEG_QUALITY = 85;
const CONCURRENCY = 4; // process 4 TIFFs at a time to stay within memory budget

let converted = 0;
let skipped = 0;
let failed = 0;
let pdfsCopied = 0;
let pdfsSkipped = 0;

function isStale(srcPath, destPath) {
  if (!existsSync(destPath)) return true;
  return statSync(srcPath).mtimeMs > statSync(destPath).mtimeMs;
}

async function convertOne(srcPath, destPath) {
  mkdirSync(dirname(destPath), { recursive: true });
  await sharp(srcPath)
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(destPath);
}

function copyPdf(srcPath, destPath) {
  mkdirSync(dirname(destPath), { recursive: true });
  copyFileSync(srcPath, destPath);
}

async function processBatch(batch) {
  await Promise.all(
    batch.map(async ({ srcPath, destPath, name }) => {
      try {
        await convertOne(srcPath, destPath);
        converted++;
        process.stdout.write(`  ✓ ${name}\n`);
      } catch (err) {
        failed++;
        process.stderr.write(`  ✗ ${name}: ${err.message}\n`);
      }
    })
  );
}

async function main() {
  const articleDirs = readdirSync(ASSETS_DIR).filter((d) => {
    try {
      return statSync(join(ASSETS_DIR, d)).isDirectory();
    } catch {
      return false;
    }
  });

  // Build work list up front so we can report totals
  const work = [];
  for (const articleId of articleDirs) {
    const srcDir = join(ASSETS_DIR, articleId);
    let entries;
    try {
      entries = readdirSync(srcDir);
    } catch {
      continue;
    }
    for (const file of entries) {
      const lower = file.toLowerCase();
      if (lower.endsWith('.tif') || lower.endsWith('.tiff')) {
        const stem = basename(file, lower.endsWith('.tiff') ? '.tiff' : '.tif');
        const srcPath = join(srcDir, file);
        const destPath = join(IMAGES_DIR, articleId, `${stem}.jpg`);
        if (isStale(srcPath, destPath)) {
          work.push({ srcPath, destPath, name: `${articleId}/${stem}.jpg` });
        } else {
          skipped++;
        }
      } else if (lower.endsWith('.pdf')) {
        const srcPath = join(srcDir, file);
        const destPath = join(FILES_DIR, articleId, file);
        if (isStale(srcPath, destPath)) {
          try {
            copyPdf(srcPath, destPath);
            pdfsCopied++;
          } catch (err) {
            process.stderr.write(`  ✗ PDF ${articleId}/${file}: ${err.message}\n`);
          }
        } else {
          pdfsSkipped++;
        }
      }
    }
  }

  const total = work.length + skipped;
  console.log(`\nTIFF → JPEG conversion`);
  console.log(`  ${total} source TIFFs found`);
  console.log(`  ${skipped} already up-to-date, ${work.length} to convert`);
  console.log(`\nPDF copy`);
  console.log(`  ${pdfsCopied} copied, ${pdfsSkipped} already up-to-date\n`);

  if (work.length === 0) {
    console.log('Nothing to do.\n');
    return;
  }

  // Process in batches of CONCURRENCY
  for (let i = 0; i < work.length; i += CONCURRENCY) {
    const batch = work.slice(i, i + CONCURRENCY);
    await processBatch(batch);
    const done = Math.min(i + CONCURRENCY, work.length);
    process.stdout.write(`  [${done}/${work.length}]\n`);
  }

  console.log(`\nDone: ${converted} TIFFs converted, ${skipped} skipped, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('convert-images failed:', err);
  process.exit(1);
});
