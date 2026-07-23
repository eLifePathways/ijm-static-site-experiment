/**
 * Prepare static assets for the IJM site build:
 *   1. Copy TIFF figures, renamed .tif -> .tiff, into src/generated-tiffs/
 *      {id}/{stem}.tiff — NOT public/. Astro's own asset pipeline (sharp
 *      under the hood, same as this script used to call directly) only
 *      recognizes the 4-letter ".tiff" extension, not ".tif", which is
 *      what every source file here actually uses — hence the rename.
 *      Once inside src/, src/utils/images.ts's import.meta.glob() picks
 *      these up and getImage() converts to WebP, computing width/height
 *      from the real file instead of trusting the CMS export's JSON size
 *      field, which turned out to be wrong for some figures (see the
 *      commit that introduced this file for specifics).
 *   2. Copy PDFs to public/files/{id}/{file}.pdf (unchanged).
 *
 * Both operations are idempotent: files are skipped when the destination
 * already exists and is newer than the source.
 *
 * Run via:  npm run prepare-assets
 * Wired as: prebuild (runs automatically before `npm run build`)
 */

import { readdirSync, mkdirSync, existsSync, statSync, copyFileSync } from "fs";
import { join, resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ASSETS_DIR = resolve(__dirname, "../assets/files");
const TIFFS_DIR = resolve(__dirname, "../src/generated-tiffs");
const FILES_DIR = resolve(__dirname, "../public/files");

let tiffsCopied = 0;
let tiffsSkipped = 0;
let pdfsCopied = 0;
let pdfsSkipped = 0;

function isStale(srcPath, destPath) {
  if (!existsSync(destPath)) return true;
  return statSync(srcPath).mtimeMs > statSync(destPath).mtimeMs;
}

function copyInto(srcPath, destPath) {
  mkdirSync(dirname(destPath), { recursive: true });
  copyFileSync(srcPath, destPath);
}

function main() {
  const articleDirs = readdirSync(ASSETS_DIR).filter((d) => {
    try {
      return statSync(join(ASSETS_DIR, d)).isDirectory();
    } catch {
      return false;
    }
  });

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
      if (lower.endsWith(".tif") || lower.endsWith(".tiff")) {
        const stem = basename(file, lower.endsWith(".tiff") ? ".tiff" : ".tif");
        const srcPath = join(srcDir, file);
        const destPath = join(TIFFS_DIR, articleId, `${stem}.tiff`);
        if (isStale(srcPath, destPath)) {
          copyInto(srcPath, destPath);
          tiffsCopied++;
        } else {
          tiffsSkipped++;
        }
      } else if (lower.endsWith(".pdf")) {
        const srcPath = join(srcDir, file);
        const destPath = join(FILES_DIR, articleId, file);
        if (isStale(srcPath, destPath)) {
          copyInto(srcPath, destPath);
          pdfsCopied++;
        } else {
          pdfsSkipped++;
        }
      }
    }
  }

  console.log(
    `TIFFs: ${tiffsCopied} copied, ${tiffsSkipped} already up-to-date`,
  );
  console.log(`PDFs:  ${pdfsCopied} copied, ${pdfsSkipped} already up-to-date`);
}

main();
