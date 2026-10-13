# IJM static site

Astro static-site port of the International Journal of Microsimulation (IJM), reading
directly from the pre-generated content under `./data/` instead of the legacy
PHP/Symfony application.

## Requirements

- Node 22 and pnpm (both pinned in `mise.toml`; run `mise install` to get them)
- The sibling directories this build reads from: `./data/` (article/collection/subject
  JSON) and `./assets/files/` (source TIFF figures and PDFs)

## Running locally

All tasks go through the `Makefile`; each target installs dependencies first if
`package.json` or `pnpm-lock.yaml` has changed.

```bash
make dev
```

This starts the Astro dev server at `http://localhost:4321`. Before it starts, the
`prepare-assets` step (`scripts/prepare-assets.mjs`) copies TIFF figures from
`assets/files/` into `src/generated-tiffs/` and PDFs into `public/files/` — this can take
a while the first time (1,422 images); subsequent runs only copy what's stale.

## Building

```bash
make prod
```

Runs, in order: `prepare-assets`, `astro build`, `pagefind --site dist` (which indexes
the built article pages for the `/search` page), then `astro preview` to serve the
built `dist/` locally, e.g. to test search end-to-end.

## Tests and checks

```bash
make test      # vitest unit + data-integrity tests
make check     # astro type-check
make lint      # eslint
```

## Cleaning up

```bash
make clean     # remove build output (dist/, .astro/)
make clobber   # clean, plus generated assets and node_modules — a blank slate
```

## Deploying to GitHub Pages

Nothing here sets this up (CI/CD is intentionally out of scope for this port) — this is
what would be needed:

1. **A workflow** that runs the build steps of `make prod` (everything except `astro preview`) in `site/` and deploys `site/dist/`
   using `actions/upload-pages-artifact` + `actions/deploy-pages` (or pushes `dist/` to a
   `gh-pages` branch).
2. **A path decision.** Every internal link and asset reference in this codebase
   (`/articles/...`, `/images/...`, `/files/...`, `/pagefind/...`, `/favicon.ico`, the
   About-section nav, etc.) is root-relative — none of it goes through Astro's `base`
   config. That's fine if the site is served from the domain root, but a standard GitHub
   Pages _project_ site without a custom domain is served from
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
3. **TIFF conversion cost.** The prepare-assets step copies 1,422 TIFFs on a cold cache; a CI
   cache keyed on `assets/files/**/*.tif` (see the commented-out skeleton previously in
   this repo's planning notes) avoids repeating that on every deploy.
