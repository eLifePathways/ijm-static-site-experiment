/**
 * Merges individual per-article/collection/subject JSON files into three
 * combined arrays. This lets the Astro build use file() loaders instead of
 * glob() loaders, which opens all files concurrently and can exhaust the
 * system's file-descriptor limit (cgroup hard limit: 4096 in CI sandboxes).
 *
 * Output (relative to repo root):
 *   api/data/articles-all.json
 *   api/data/collections-all.json
 *   api/data/subjects-all.json
 *
 * The script is idempotent: if an output file is newer than all of its inputs,
 * it is skipped.
 */

import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '../../api/data');

async function newestMtime(dir) {
  const files = await readdir(dir);
  let newest = 0;
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const s = await stat(resolve(dir, f));
    if (s.mtimeMs > newest) newest = s.mtimeMs;
  }
  return newest;
}

async function outMtime(path) {
  try {
    return (await stat(path)).mtimeMs;
  } catch {
    return 0;
  }
}

async function merge(dir, outPath) {
  const [srcTime, dstTime] = await Promise.all([newestMtime(dir), outMtime(outPath)]);
  if (dstTime > srcTime) {
    console.log(`  skip  ${outPath} (up to date)`);
    return;
  }
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  const items = [];
  for (const f of files) {
    const raw = await readFile(resolve(dir, f), 'utf-8');
    items.push(JSON.parse(raw));
  }
  await writeFile(outPath, JSON.stringify(items));
  console.log(`  wrote ${outPath} (${items.length} items)`);
}

await merge(resolve(DATA_DIR, 'articles'), resolve(DATA_DIR, 'articles-all.json'));
await merge(resolve(DATA_DIR, 'collections'), resolve(DATA_DIR, 'collections-all.json'));
await merge(resolve(DATA_DIR, 'subjects'), resolve(DATA_DIR, 'subjects-all.json'));
