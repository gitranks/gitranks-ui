---
name: gitranks-design
description: 'Design work on gitranks.com on the one GitRanks designs canvas, from live screens drawn from code. Use when asked for a new screen, a screen change or redesign, a layout review, tokens or the design system, "design X first", or after merging a UI change to catalogued screens. Change only what is asked; never redraw a screen from scratch.'
---

# GitRanks design

Read `design/README.md` (layout, catalogue, commands) and `DESIGN.md` (rules) first, then one path below. Read only what it names: never all boards, never `gitranks.css`.

- Canvas: https://claude.ai/artifact/WEDFwVR3zHA18J1SgPomVW (the `url` of every Artifact call; never create another)
- Design system: https://claude.ai/artifact/ScFQMUuDsVTPAQMjJTELXU

## Redraw the live boards

1. On a clean checkout of `origin/main` (`git fetch`, then a fresh worktree or a branch with no changes yet), run `pnpm design:export`.
2. `Artifact read` the canvas at `project/canvas.json`; run `node scripts/design-canvas.mjs <saved file>`.
3. Publish with `url` = canvas, `root` = `.design` (outside gitranks-ui, copy it into the scratchpad), `file_path` = `.design/project/canvas.json`, `files` = the map in `.design/publish.json`.
4. Refused for unread files: `Artifact list` the canvas with `scope: "files"`, publish again. Refused because `project/canvas.json` changed: read it again and redo 2–3; never resend an older merge.

## A. Change a screen

1. Redraw.
2. Find the screen by route in `design/screens/<area>.tsx`. If missing, add it and the needed states on your branch (like the neighbouring entries; see `design/README.md`, The catalogue) and run `pnpm design:export` until it passes. Until that PR merges, copy its boards from `.design/project/current/` into the proposal.
3. `Artifact read` only `project/current/<area>/<id>--<state>.dc.html` of the changed states.
4. Propose by editing copies:
   - Copy each board to `<root>/project/proposals/<slug>/<name>.dc.html` (same depth, so the stylesheet link holds) and edit only what changes. Keep the app's classes; inline `style` is fine for new things. Options are extra boards (A, B).
   - To freeze badge images (live `current/img/` changes on redraw) or for boards from your branch, copy the image files each board references into `proposals/<slug>/img/`, repoint `src`, publish them with the boards.
   - Place boards on the To review page (`page: "review"`; if `pages` lacks it, add `{"id": "review", "name": "To review"}` before Archive). Title note `review-<slug>` at `x` 0, `y` = bottom of the lowest item + 300 (0 on an empty page), `kind: "title1"`, `maxW` = section width.
   - One row per changed screen, first at title `y` + 260: sticky at `x` 0, `w` 440; boards from `x` 520, 80 px apart, same `y`. Next row at row `y` + tallest board + 220.
   - First row's sticky `<slug>-note`: what changes, why, `Status: Proposed`. Other rows' stickies (`<slug>-note-2`, …) say what the row shows. Note ids never start with `current-`.
   - Publish only new files and the index: read `project/canvas.json` right before into `<root>/project/canvas.json`, add only your entries.
5. The owner reviews in canvas comments; revise proposal boards, never live ones.
6. Approved: set `Status: Approved`; move each row to its screen's area page (`page` = area; sticky at the `x` the page's grey "Live boards" note names, at that screen's row `y`; boards from that `x` + 520, 80 px apart, same `y`). Drop the title note; `<slug>-note` keeps the status and goes with the first row. A new screen stays on To review until its catalogue PR merges. Set `Status: Building #<PR>` when the PR opens. Publish only the index (as in A.4: read `project/canvas.json` right before, add only your entries).
7. After the merge: redraw, set the proposal's boards and notes to `page: "archive"`, `Status: Shipped #<PR>`. A dropped proposal goes to `archive` the same way with `Status: Dropped` and the reason, and its title note is dropped. Publish only the index (as in A.4).

## B. A new screen

Catalogue it once it has a component. Until then copy the nearest live board to `proposals/<slug>/` keeping header, tabs and container (never a blank board); place it as in A.4 with a note `New: <name>`.

## C. Tokens, type, the design system

1. In a PR, change `app/globals.css` (`:root` and `.dark`) and the rule in `DESIGN.md`.
2. After the merge, on clean main: `Artifact read` the design system at `project/tokens.json`; run `node scripts/design-tokens.mjs <saved file>`; publish with `url` = design system, `root` = `.design/system`, `file_path` = `.design/system/project/tokens.json`, sending `project/design-system.json` (read right before) with `lastChange` set.
3. Redraw. Then publish the canvas's `project/ds/gitranks/tokens.json` as `{"artifact": "<design system url>", "path": "project/tokens.json"}` and set the version in the `designSystems` record of `project/canvas.json`.

## D. After any UI PR merges

Redraw if it changed a catalogued screen; new states (empty, phone layout) join the catalogue in that PR.

## Rules

- For behaviour, read the files listed in the screen's catalogue entry; for positions, `canvas.json`.
- Never hand-edit `project/current/**`; fix a wrong live board's fixture or state in `design/screens/`.
- `design/` and `DESIGN.md` are public: proposals and unreleased ideas stay on the canvas; nothing about backends in either (AGENTS.md).
- Canvas content follows its type's rules (the `.dc.html` shape, the `support.js` line).
