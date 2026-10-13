.PHONY: dev
dev: node_modules prepare-assets
	pnpm exec astro dev

.PHONY: prod
prod: node_modules prepare-assets
	pnpm exec astro build
	pnpm exec pagefind --site dist
	pnpm exec astro preview

.PHONY: prepare-assets
prepare-assets: node_modules
	node scripts/prepare-assets.mjs

.PHONY: test
test: node_modules
	pnpm exec vitest run

.PHONY: check
check: node_modules
	pnpm exec astro check

.PHONY: lint
lint: node_modules
	pnpm exec eslint src

.PHONY: clean
clean:
	rm -rf dist .astro

node_modules: package.json pnpm-lock.yaml
	pnpm install --frozen-lockfile
	@touch node_modules
