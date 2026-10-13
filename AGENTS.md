# Agent notes for this project

Practical notes for working on this Astro site in this sandbox. See `README.md` for
what the project actually is.

## Sandbox quirks

- The package manager is **pnpm** (pinned via mise in `mise.toml`), not npm —
  don't create a `package-lock.json`. pnpm doesn't hoist transitive deps, so
  import only packages declared in `package.json` (e.g. zod via `astro/zod`).
  Dependencies allowed to run install scripts are listed under `allowBuilds`
  in `pnpm-workspace.yaml`.
- **Always `unset NPM_CONFIG_PREFIX` before any `pnpm` command** — it's set
  globally and breaks nvm otherwise.
- The main checkout (`.../microsimulation/ijm`) is likely mounted in a way that
  exhausts the process file-descriptor limit for this project's file count
  (`node_modules`, `src/generated-tiffs`, `public/`). **Do real work in a git
  worktree under `/home/agent/` instead**:
  ```bash
  git worktree add /home/agent/<some-name> -b <branch-name>
  ```
  Then symlink the heavy gitignored directories from the main checkout instead of
  reinstalling/regenerating them (they won't be picked up by `git add -A` since
  `.gitignore`'s `dir/` patterns don't match symlinks — don't stage them):
  ```bash
  ln -s /home/hff/work/microsimulation/ijm/site/node_modules      <worktree>/site/node_modules
  ln -s /home/hff/work/microsimulation/ijm/site/src/generated-tiffs <worktree>/site/src/generated-tiffs
  ```
- First `pnpm`/`astro` command in a fresh worktree needs `mise trust` run once in
  `site/` (mise.toml isn't trusted for new working directories by default).
- Dev server: `pnpm dev --port <port> --host 0.0.0.0`, backgrounded
  (`( ... & )`). Takes ~15–20s to fully start (loads all articles + generated
  TIFFs). If a change you made doesn't seem to take effect after a reload, don't
  trust Vite HMR — kill the process and start a fresh `pnpm dev`; stale served
  CSS/JS after edits has happened more than once in this sandbox.

## Validating changes

- `pnpm test` — vitest unit tests (`src/tests/`).
- `pnpm check` — typecheck.
- `pnpm lint` — lint.
- For visual/behavioral parity with the legacy PHP app, compare live vs local
  with `rodney` (`uvx rodney ...`):
  - `rodney pages` tab indices are **not stable across commands** — re-check
    `rodney pages`/`rodney url` before every action rather than assuming.
  - `rodney screenshot`/`screenshot-el` intermittently hangs
    ("context deadline exceeded"), especially on the live external site or pages
    with heavy content (e.g. many MathML equations). Don't loop-retry — fall back
    to `rodney html <selector>` / `rodney js "..."` (structural/computed-style
    comparison), which is reliable and usually sufficient without a screenshot.
  - `rodney screenshot -w N -h N` only sets the viewport for that one capture; it
    does not persist for subsequent `js`/`html` calls on the same page.
  - Occasional panics ("Execution context was destroyed") on `reload`/`open`
    seem to self-recover — check `rodney status` after rather than assuming failure.
  - For exact CSS ground truth from the live site, `curl` its compiled
    stylesheet directly (find the URL via `document.styleSheets` in rodney)
    instead of relying on live viewport-dependent checks.

## Component architecture

- `src/components/` = site-wide components (header/footer/homepage bits).
  `src/components/article/` = article-page-only components. `src/layouts/` has
  the one `BaseLayout.astro`. Route files live in `src/pages/` — mostly
  `.astro`, but citation exports are plain `.ts` API routes
  (`[id].bib.ts`/`[id].ris.ts`) returning a `Response`.
- Components that take a whole article use the same prop shape:
  `{ article: CollectionEntry<'articles'> }` (see `ArticleHeader.astro`,
  `ArticleInfo.astro`) — destructure `article.data` in frontmatter, don't pass
  individual fields down.
- `BodyNode.astro` renders the article body tree **recursively** (imports
  itself), with `depth` controlling both the heading level (`h${depth}`,
  capped at h6) and whether a `section` node is independently collapsible
  (only at `depth === 2`, i.e. top-level). Appendices reuse this component
  directly rather than a separate renderer — see the `isSectionShaped` check
  for why appendix nodes (which have no explicit `type` field) still match.
- Collapsible sections everywhere (article sections, references, the ToC,
  the homepage issues-by-year groups) use **native `<details>`/`<summary>`**,
  not JS — this reproduces the legacy PHP site's click-to-expand behaviour
  with zero JS and works before hydration. Only the first top-level section
  after the abstract defaults `open`; everything else defaults closed
  (`open={index === 0}`), matching the legacy default state exactly.
- Pure logic (formatting, grouping, anything with edge cases worth a unit
  test) belongs in `src/utils/`, not inline in a component's frontmatter —
  extracted this way specifically so it's testable without an Astro/browser
  context. `src/utils/articleContent.ts` (citation/author formatting) and
  `src/utils/issues.ts` (year-banding) are the examples to follow.
- Astro template gotcha: an inline TS object-type annotation on a `.map()`
  callback parameter (e.g. `.map((x: { foo: string; bar?: number }) => ...)`)
  can fail to parse inside the template section, especially multi-line. Define
  a named `interface` in frontmatter and annotate with that instead.

## CSS architecture

- Tokens (`src/styles/tokens/`): `--color-*` (pulled from the legacy site's
  compiled CSS by frequency of use), `--font-*`, `--space-3xs`…`--space-3xl`,
  and a type scale `--step--2`…`--step-6` (negative = below body size, used
  for fine print/eyebrows; positive = headings). Most spacing/heading sizes
  are fluid (`clamp()`, utopia.fyi-style, 320px→1240px viewport); a few sizes
  are deliberately static because the legacy site doesn't scale them either
  (see the comment in `typography.css`). Always reach for an existing token
  over a hardcoded value.
- `src/styles/layout.css` has small reusable primitives — `.wrapper` (the
  legacy site's max content width, 69.625rem) and `.stack` (consistent
  vertical rhythm) — used as a class, not a component.
- Naming is BEM-ish: `.block`, `.block__part`, `.block--modifier`
  (`.article-info__section`, `.article-section--collapsible`).
- Default to each component's own scoped `<style>` block (CSS nesting with
  `&` is fine — it's supported and used throughout). **But scoped styles
  don't cross component boundaries**: if a class is rendered by more than one
  component (e.g. `.article-section`, used by `BodyNode.astro`,
  `ReferenceList.astro`, and `ArticleInfo.astro`), its rule has to live in
  `src/styles/global.css` instead, or the other components simply won't get
  it. `global.css` has a comment marking exactly this case — follow that
  pattern rather than duplicating the rule per-component.
- Headless Chrome in this sandbox doesn't reliably render some Unicode
  glyphs used for disclosure markers (▸/▾ showed as tofu boxes). Draw
  triangles with the CSS border trick instead (see `.article-section--collapsible`
  in `global.css`) — same technique the legacy site's own CSS uses, and it
  needs no font glyph coverage.
- Breakpoints matched to the legacy site's own compiled CSS, not arbitrary:
  `45.625em` (~730px, mobile/desktop header split) and `75em` (~1200px,
  sidebar vs. inline ToC). Reuse these rather than introducing new ones
  unless you've confirmed a new legacy breakpoint via its compiled CSS.

## Commits and merging

- Commit subjects are prefixed `[agent] <description>` (not conventional-commit
  `fix:`/`feat:`), with a why-focused body and a
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` trailer.
- Merge a worktree branch back into `static-site-experiment` with
  `git merge --ff-only` — no merge commits. If it can't fast-forward (e.g. the
  branch it was created from has since had its history rewritten upstream),
  rebase the worktree branch onto the current tip first — verify
  `git diff <old-tip> <new-tip>` is empty before rebasing to confirm it's a
  pure history replay, not a real divergence — then fast-forward.
- Check `git rev-parse --abbrev-ref --symbolic-full-name @{u}` before rewriting
  any branch history — only safe when there's no upstream (not pushed).
