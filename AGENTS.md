# Agent notes for this project

Practical notes for working on this Astro site in this sandbox. See `README.md` for
what the project actually is.

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
- Collapsible sections everywhere (article sections, references, the
  homepage issues-by-year groups) use **native `<details>`/`<summary>`**,
  not JS — this reproduces the legacy PHP site's click-to-expand behaviour
  with zero JS and works before hydration. All article sections (body,
  appendices, references, article info, and the Figures/Tables sections
  on the figures view) default `open` — a deliberate
  departure from the legacy site, which only expanded the first section.
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
