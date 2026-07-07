# IJM static site

Astro static-site port of the International Journal of Microsimulation (IJM), reading
directly from the pre-generated content under `../api/data/` instead of the legacy
PHP/Symfony application in `../journal/`.

## Requirements

- Node 22 (see `mise.toml`; `mise install` will pick it up automatically if you use mise)
- The sibling directories this build reads from: `../api/data/` (article/collection/subject
  JSON) and `../assets/files/` (source TIFF figures and PDFs)

## Running locally

```bash
npm install
npm run dev
```

This starts the Astro dev server at `http://localhost:4321`. On first run (and whenever
`../assets/files/` changes), the `prebuild` script converts TIFF figures to JPEG and
copies PDFs into `public/images/` and `public/files/` — this can take a while the first
time (1,422 images); subsequent runs are idempotent and only convert what's stale.

## Building

```bash
npm run build
```

Runs, in order: `prebuild` (TIFF→JPEG + PDF copy into `public/`), `astro build` (425
pages), `postbuild` (`pagefind --site dist`, which indexes the built article pages for
the `/search` page). Output goes to `site/dist/`.

```bash
npm run preview   # serve the built dist/ locally, e.g. to test search end-to-end
```

## Tests and checks

```bash
npm test        # vitest unit + data-integrity tests
npm run check   # astro type-check
npm run lint    # eslint
```

## Deploying to GitHub Pages

Nothing here sets this up (CI/CD is intentionally out of scope for this port) — this is
what would be needed:

1. **A workflow** that runs `npm ci && npm run build` in `site/` and deploys `site/dist/`
   using `actions/upload-pages-artifact` + `actions/deploy-pages` (or pushes `dist/` to a
   `gh-pages` branch).
2. **A path decision.** Every internal link and asset reference in this codebase
   (`/articles/...`, `/images/...`, `/files/...`, `/pagefind/...`, `/favicon.ico`, the
   About-section nav, etc.) is root-relative — none of it goes through Astro's `base`
   config. That's fine if the site is served from the domain root, but a standard GitHub
   Pages *project* site without a custom domain is served from
   `https://<org>.github.io/<repo>/`, which would break every one of those links. Two
   ways to resolve this:
   - **Custom domain (recommended, and how the legacy site is currently deployed at
     microsimulation.pub):** add a `site/public/CNAME` file with the domain, and
     configure it in the repo's GitHub Pages settings. The site is then served from `/`
     and no code changes are needed.
   - **No custom domain:** set `base: '/<repo-name>/'` in `astro.config.mjs` and change
     every hardcoded root-relative path in the codebase to respect it (via
     `import.meta.env.BASE_URL` or Astro's `base`-aware helpers). This is a real refactor,
     not a config toggle, given how many places currently assume root.
3. **TIFF conversion cost.** The prebuild step converts 1,422 TIFFs on a cold cache; a CI
   cache keyed on `assets/files/**/*.tif` (see the commented-out skeleton previously in
   this repo's planning notes) avoids repeating that on every deploy.

## Sandbox note (agent development environments only)

If you're building this inside a containerized dev sandbox and `npm install` or
`npm run build` fail with `EMFILE`/file-descriptor errors, check whether the repo
directory is mounted via `virtiofs` (`df -T <path>`) — it multiplies per-file-open cost
enough to exhaust the process fd limit on this project's `glob()` content loaders and
`public/` asset count. The fix is environmental, not code: move the working copy onto
the container's own local filesystem with a git worktree (e.g.
`git worktree add -b <branch>-tmp /somewhere-local <branch>`) rather than reintroducing
code-level workarounds — this fully resolves it with zero code changes.
