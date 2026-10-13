# IJM static site

Astro static-site port of the International Journal of Microsimulation (IJM). Instead of the legacy PHP / Symfony applicatation, this static site builds from: `./data/` (article/collection/subject
JSON) and `./assets/files/` (source TIFF figures and PDFs).

## Requirements

Node and pnpm (both pinned in `mise.toml`; run `mise install` to get them).

## Running locally

- `make dev` gives you hot reloading, but because of this search doesn't work.
- `make prod` is the equivalent to the version that would be deployed. Rerun to reload. Pregenerated assets; search works.
- `make dist` builds the deployable site (including the search index) into `dist/` without serving it.

## Checking changes

`make check` runs various linters and tests.

## Cleaning up

- `make clean` removes build output (`dist/`, `.astro/`)
- `make clobber` cleans, plus also removes generated assets and node_modules — a blank slate.
