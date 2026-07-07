# Agent notes for this project

Practical notes for working on this Astro site in this sandbox. See `README.md` for
what the project actually is.

## Sandbox quirks

- **Always `unset NPM_CONFIG_PREFIX` before any `npm`/`npx` command** — it's set
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
- First `npm`/`astro` command in a fresh worktree needs `mise trust` run once in
  `site/` (mise.toml isn't trusted for new working directories by default).
- Dev server: `npm run dev -- --port <port> --host 0.0.0.0`, backgrounded
  (`( ... & )`). Takes ~15–20s to fully start (loads all articles + generated
  TIFFs). If a change you made doesn't seem to take effect after a reload, don't
  trust Vite HMR — kill the process and start a fresh `npm run dev`; stale served
  CSS/JS after edits has happened more than once in this sandbox.

## Validating changes

- `npm test` — vitest unit tests (`src/tests/`).
- `npx astro check` — typecheck.
- `npx eslint src` — lint.
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
