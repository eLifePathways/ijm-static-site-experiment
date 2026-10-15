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

# Visual regression tests: Playwright runs in Docker (pinned browser/fonts,
# so screenshots match across machines) against `astro preview` on the host.
# Uses its own port so it doesn't collide with `make dev`/`make prod`.
VRT_IMAGE := ijm-vrt
VRT_PORT := 4322

.vrt-image: Dockerfile.vrt package.json pnpm-lock.yaml pnpm-workspace.yaml
	docker build -f Dockerfile.vrt -t $(VRT_IMAGE) .
	@touch .vrt-image

VRT_RUN = docker run --rm -i --init --ipc=host \
	--user "$$(id -u):$$(id -g)" \
	--mount type=bind,source="$(CURDIR)/visual-regression",target=/work/visual-regression \
	--add-host=host.docker.internal:host-gateway \
	-e VRT_BASE_URL=http://host.docker.internal:$(VRT_PORT) \
	$(VRT_IMAGE) \
	pnpm exec --config.verify-deps-before-run=false playwright test --config=visual-regression/playwright.config.ts

# Build, serve dist/ in the background, run $(VRT_RUN) with the given extra
# args, and always stop the server afterwards.
define vrt_with_preview
	lsof -t -i TCP:$(VRT_PORT) -s TCP:LISTEN | xargs kill 2>/dev/null || true
	pnpm exec astro build
	pnpm exec astro preview --port $(VRT_PORT) --host --allowed-hosts host.docker.internal > /dev/null & PREVIEW_PID=$$!; \
	trap 'kill $$PREVIEW_PID 2>/dev/null' EXIT; \
	until curl -sf http://localhost:$(VRT_PORT)/ > /dev/null; do \
		kill -0 $$PREVIEW_PID 2>/dev/null || { echo "astro preview exited" >&2; exit 1; }; \
		sleep 1; \
	done; \
	$(VRT_RUN) $(1)
endef

.PHONY: vrt-reference
vrt-reference: node_modules prepare-assets .vrt-image
	$(call vrt_with_preview,--update-snapshots)

.PHONY: vrt-test
vrt-test: node_modules prepare-assets .vrt-image
	$(call vrt_with_preview,) || { pnpm exec playwright show-report visual-regression/html_report; exit 1; }

.PHONY: vrt-test-no-report
vrt-test-no-report: node_modules prepare-assets .vrt-image
	$(call vrt_with_preview,)

.PHONY: vrt-report
vrt-report: node_modules
	pnpm exec playwright show-report visual-regression/html_report
