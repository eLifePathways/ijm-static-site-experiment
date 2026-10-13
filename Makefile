.PHONY: dev
dev: node_modules prepare-assets
	pnpm exec astro dev

.PHONY: prod
prod: dist
	pnpm exec astro preview

# agent thinks: Phony so it always rebuilds — astro's inputs are too spread out to track here.
.PHONY: dist
dist: node_modules prepare-assets
	pnpm exec astro build
	pnpm exec pagefind --site dist

.PHONY: prepare-assets
prepare-assets: node_modules
	node scripts/prepare-assets.mjs

.PHONY: test
test: node_modules
	pnpm exec vitest run

.PHONY: check
check: node_modules lint test
	pnpm exec astro check

.PHONY: lint
lint: node_modules
	pnpm exec eslint src

.PHONY: clean
clean:
	rm -rf dist .astro

.PHONY: clobber
clobber: clean
	rm -rf src/generated-tiffs public/files node_modules

node_modules: package.json pnpm-lock.yaml
	pnpm install --frozen-lockfile
	@touch node_modules
