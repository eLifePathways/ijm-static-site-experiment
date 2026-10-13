# IJM static site

Astro static-site port of the International Journal of Microsimulation (IJM). Instead of the legacy PHP / Symfony applicatation, this static site builds from: `./data/` (article/collection/subject
JSON) and `./assets/files/` (source TIFF figures and PDFs).

## Requirements

Node and pnpm (both pinned in `mise.toml`; run `mise install` to get them).

## Running locally

- `make dev` gives you hot reloading, but because of this search doesn't work.
- `make prod` is the equivalent to the version that would be deployed. Rerun to reload. Pregenerated assets; search works.

## Checking changes

`make check` runs various linters and tests.

## Cleaning up

- `make clean` removes build output (`dist/`, `.astro/`)
- `make clobber` cleans, plus also removes generated assets and node_modules — a blank slate.

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
