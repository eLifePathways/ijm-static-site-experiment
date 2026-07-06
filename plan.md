# IJM Static Site — Agent Handoff Plan

## Project context

The International Journal of Microsimulation (IJM) runs as a PHP/Symfony application.
The entire content store (338 articles, 50 collections, 20 subjects) is already static
JSON under `api/data/`. The goal is to replace the PHP stack with an **Astro static
site** that reads that JSON directly, pre-converts TIFF figure images to JPEG, and
deploys to a CDN.

Repository layout:
```
api/         — pre-generated JSON content (articles, collections, subjects)
assets/      — source files: TIFF figures, PDFs
site/        — Astro project (this is where you work)
generated/   — build artefact: JPEGs + PDFs (gitignored, rebuilt by CI)
playwright/  — Playwright test suite (runs against BASE_URL)
journal/     — legacy PHP application (read-only reference)
```

Branch: `static-site-experiment`

---

## Sandbox constraints (important for any agent running this)

The sandbox mounts the repo via **virtiofs**, which multiplies kernel fd cost per file
open. The cgroup hard fd limit is **4096 per process** and cannot be raised.

**Rule:** Never run `rm -rf node_modules` or any bulk-delete on virtiofs — it exhausts
the virtiofs handle pool and makes the entire mount return EMFILE until the sandbox
is restarted.

### How the build stays within the fd limit

Content collections used to use `glob()` loaders that opened all 408 source JSON files
simultaneously via `Promise.all`. That alone exceeded the fd budget.

**Fix applied (already committed):** A merge step runs before the Astro build and
collapses all individual JSON files into three arrays:

```
api/data/articles-all.json    (338 articles)
api/data/collections-all.json  (50 collections)
api/data/subjects-all.json     (20 subjects)
```

`content.config.ts` uses `file()` loaders that open one file each. The build now
comfortably fits within 4096 fds.

If a fresh `astro sync` ever fails with EMFILE in a future session, add this to
`astro.config.mjs` to move the content-layer cache off virtiofs:

```js
cacheDir: '/tmp/astro-cache',
```

---

## Build from scratch

```bash
cd site
npm install
npm run build      # prebuild: merge-content + convert-images
                   # build:    astro build (425 pages)
                   # postbuild: copy generated/ into dist/
```

Outputs:
- `site/dist/`         — static HTML/CSS/JS (serve this)
- `generated/images/`  — 1 422 JPEGs (gitignored, recreated by prebuild)
- `generated/files/`   — 346 PDFs  (gitignored, recreated by prebuild)

Running tests:
```bash
npm test           # vitest unit + data-integrity tests (18 tests)
npm run check      # astro type-check
npm run lint       # eslint
```

---

## What is done

### Phase 0 — Playwright baseline ✅
E2E test suite in `playwright/` with Page Object Model. Runs against any `BASE_URL`
so it can validate both the PHP site and the Astro site. Covers articles, search,
navigation, article types, subjects, about pages, and homepage.

### Phase 1 — Astro scaffold + content collections ✅
- Astro 7.0.6, TypeScript strict, Node 22
- Content Layer API with `file()` loaders (see fd-limit note above)
- `src/utils/slugs.ts` — `issueSlug()`, `ARTICLE_TYPE_LABELS`, `articleTypeLabel()`
- `src/pages/` stubs for all routes (articles, collections, subjects, about, search)
- ESLint 9 flat config, Vitest, 18 passing tests

### Phase 2 — Article body renderer ✅
Full article page at `src/pages/articles/[id].astro` with:
- `src/components/article/ArticleHeader.astro` — title, authors, DOI, subjects,
  abstract, PDF/BibTeX/RIS download links
- `src/components/article/BodyNode.astro` — recursive renderer for all 10 body node
  types: `section`, `paragraph`, `figure`, `list`, `mathml`, `box`, `code`, `quote`,
  `table`, `image`
- `src/components/article/ArticleFigure.astro` — figure images and table HTML
- `src/components/article/ReferenceList.astro` — all 11 reference types
- `src/utils/articleContent.ts` — PDF path rewriter, image path helper, author
  formatter
- `astro check` reports 0 errors

### Phase 3 — TIFF→JPEG conversion ✅
- `site/scripts/convert-images.mjs` — converts 1 422 TIFFs to JPEG (quality 85,
  concurrency 4) and copies 346 PDFs; output to `../generated/`; idempotent
- `site/scripts/copy-generated.mjs` — postbuild: copies `generated/` into `dist/`
- `site/scripts/merge-content.mjs` — prebuild: merges individual JSON files into
  three combined arrays (fd-limit fix)
- Build produces 425 pages + 1 768 static assets in ~60 s

---

## Remaining phases

### Phase 4 — About pages (not started)

The six about-page stubs in `src/pages/about/` render placeholder text. The real
content lives in the PHP controller:

```
journal/src/Controller/AboutController.php
```

**Task:** Extract each about page's content from that PHP file and put it in
Markdown files under `src/content/about/` as a new Astro content collection, then
update each page to render from it.

Pages: aims-and-scope, editorial-board, editorial-policy, author-notes,
reviewer-notes, call-for-papers.

### Phase 5 — Search (not started)

`src/pages/search.astro` currently renders a placeholder. The PHP site has a working
search backed by Elasticsearch; the static site should use
[Pagefind](https://pagefind.app/) (zero-runtime, crawls the built HTML).

**Task:**
1. Add `npx pagefind --site dist` as a second postbuild step in `package.json`
2. Add `data-pagefind-body` to the article content `<div>` in `[id].astro` and
   `data-pagefind-ignore` on header/footer
3. Replace the placeholder in `search.astro` with `@pagefind/default-ui`
   (`client:load`)

```bash
npm install @pagefind/default-ui   # no extra devDep needed; pagefind CLI via npx
```

### Phase 6 — URL preservation + static citation endpoints (not started)

**Task:**
1. Audit all routes against the PHP app's `journal/app/config/routing.yml` and
   confirm every URL is preserved. Pay attention to the collections slug format:
   `/collections/{id}/{slug}` where slug is derived from the collection title.
2. Add static BibTeX and RIS citation endpoints:
   - `src/pages/articles/[id].bib.ts` → `GET /articles/00005.bib`
   - `src/pages/articles/[id].ris.ts` → `GET /articles/00005.ris`
   Each returns a formatted string from the article data. The existing
   `ArticleHeader.astro` already links to these URLs.

### Phase 7 — CI/CD (not started)

Replace `.github/workflows/main.yml` (legacy PHP Selenium workflow) with an Astro
build + Playwright validation pipeline.

**Task:**
1. Build and deploy the Astro site (GitHub Pages or Netlify)
2. Run the Playwright suite against the deployed URL
3. Cache `generated/images/` between runs (keyed on a hash of `assets/files/`) to
   skip re-converting 1 422 TIFFs on every deploy

```yaml
# Skeleton
- uses: actions/cache@v4
  with:
    path: generated/images
    key: tiff-${{ hashFiles('assets/files/**/*.tif') }}
```

---

## Key files reference

| Path | Purpose |
|---|---|
| `site/src/content.config.ts` | Content collection schemas (articles, issues, subjects) |
| `site/src/pages/articles/[id].astro` | Article page — wires all components |
| `site/src/components/article/BodyNode.astro` | Recursive body renderer |
| `site/src/utils/slugs.ts` | URL slug helpers, article type labels |
| `site/src/utils/articleContent.ts` | PDF/image path helpers, author formatter |
| `site/scripts/merge-content.mjs` | Merges 408 JSONs → 3 files (run before build) |
| `site/scripts/convert-images.mjs` | TIFF→JPEG conversion (runs as prebuild) |
| `api/data/articles/00005.json` | Complex article reference (figures, tables, deep nesting) |
| `journal/src/Controller/AboutController.php` | Source of truth for about page content |
| `journal/app/config/routing.yml` | PHP URL patterns to preserve |
| `playwright/tests/` | E2E tests — run with `BASE_URL=http://localhost:4321 npm test` |
