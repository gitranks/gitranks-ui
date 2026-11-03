---
name: gitranks-design
description: Use for any design work on gitranks.com, such as a new screen, a change to a screen, a layout review, a redesign, the brand, tokens or the design system, or the request "design X first". It starts from the screens as they ship today, drawn from code onto the one GitRanks designs canvas, so you change only what is asked and never redraw a screen from scratch. Also use after merging a UI change, to redraw the screens it touched.
---

# GitRanks design

Read `design/README.md` (where things are) and `DESIGN.md` (the rules) first: two short files. Then follow the matching
path below. Load only what the path names. The canvas has many boards and `gitranks.css` is 160 KB: never read all of
it.

- Canvas: https://claude.ai/artifact/WEDFwVR3zHA18J1SgPomVW (the `url` on every Artifact call; never create another)
- Design system: https://claude.ai/artifact/ScFQMUuDsVTPAQMjJTELXU

## Redraw the live boards (used by the paths below)

Live boards come from main only. The script refuses anything else.

1. On a clean checkout of `origin/main` (`git fetch`; a fresh worktree or branch with no changes yet), run
   `pnpm design:export`.
2. `Artifact read` the canvas at `project/canvas.json`, then run `node scripts/design-canvas.mjs <the saved file>`.
3. Publish:
   - `url` = the canvas
   - `root` = `.design`
   - `file_path` = `.design/project/canvas.json`
   - `files` = the map in `.design/publish.json`

   The `root` must be inside your working directory or scratchpad. If you run outside gitranks-ui, copy `.design` to the
   scratchpad first.
4. **If the publish is refused:**
   - Refused because of files you haven't read: `Artifact list` the canvas with `scope: "files"`, which makes them
     publishable without reading them, then publish again.
   - Refused because `project/canvas.json` changed: read it again and redo steps 2–3. Never resend an older merge.

## A. Change a screen, or design something on an existing one

1. **Redraw** (above), so the live boards match main.
2. **Find the screen** in `design/screens/<area>.tsx` by route.
   - If it isn't there, add the screen and the states you need on your branch. Render the real `…Screen` component with
     the fixtures its spec uses, the same way the neighbouring entries do. A page that reads its data in a server
     component gets a presentational `…Screen` first; `design/README.md` (The catalogue) says how states are drawn.
   - Run `pnpm design:export` until it passes.
   - The new boards aren't live until that PR merges. Until then, copy the ones you need from `.design/project/current/`
     into `proposals/<slug>/`, as in step 4.
3. **Read only that screen's boards.** `Artifact read` `project/current/<area>/<id>--<state>.dc.html` for the states
   your change touches.
4. **Propose by editing copies.**
   - Copy each board you change to `<root>/project/proposals/<slug>/<name>.dc.html` and edit only what changes. It sits
     at the same depth as the live board, so its stylesheet link stays as it is.
   - Its badge images point at the live `current/img/` files, which a redraw replaces. To keep them as they are, or for
     a board exported from your branch (whose images main hasn't published), copy the files it references into
     `proposals/<slug>/img/`, point its `src` there, and publish them with the boards.
   - Keep the app's classes: they come from `gitranks.css`. Inline `style` is fine for something new.
   - Give options as extra boards (A, B), not as flags.
   - Place the boards on the **To review** page (`page: "review"`). If `pages` has no `review` entry, add
     `{"id": "review", "name": "To review"}` before Archive. Give the proposal a section of its own:
     - **Title note** `review-<slug>`, at `x` 0 and `y` = the bottom of the lowest board or note on the page + 300 (0 on
       an empty page), with `kind: "title1"` and `maxW` = the section's width. It names the proposal and the screens it
       changes, e.g. "Beta label · Contribute landing and nav".
     - **One row per screen the proposal changes**, the first at the title's `y` + 260:
       - its sticky note at `x` 0, `w` 440;
       - its boards from `x` 520, 80 px apart, all at the row's `y`.

       The next row starts at the row's `y` + its tallest board + 220.
     - **The first row's sticky** is `<slug>-note`: what changes, why, and `Status: Proposed`. Any other row's sticky
       (`<slug>-note-2`, …) says what that row shows.

     The redraw never moves anything on this page. Note ids must not start with `current-`; those belong to the redraw.
   - Publish only the new files and the index: read `project/canvas.json` right before, copy that text to
     `<root>/project/canvas.json`, and add only your entries.
5. **Review.** The owner comments on the canvas. Revise the proposal boards, never the live ones.
6. **Once approved**, set the status to `Status: Approved`. Then move each row to the page of the screen it changes:
   - set `page` to that area;
   - the sticky goes at the `x` the page's grey "Live boards" note names (the proposal column), at that screen's row
     `y`;
   - the boards go from that `x` + 520, 80 px apart, at the same `y`.

   Then:
   - Drop the title note.
   - If the rows land on different pages, `<slug>-note` keeps the status and goes with the first row.
   - A new screen (B) has no live row until its catalogue PR merges. It stays on To review until then.

   From then on the redraw moves the rows with their screens. Set `Status: Building #<PR>` when the PR opens. Publish
   only the index, as in step 4.
7. **After the merge,** redraw. Then move the proposal's boards and notes to the `archive` page by setting their `page`,
   and set `Status: Shipped #<PR>`. A proposal the owner drops goes to `archive` the same way, from wherever it is,
   with `Status: Dropped` and the reason. Drop its title note. Publish only the index, as in step 4.

## B. A new screen

Add it to the catalogue as soon as it has a component. Until then, start from the nearest live board: copy it to
`proposals/<slug>/` and keep its header, tabs and container. Never start from a blank board. Put it on the To review
page as in A.4, with a note `New: <name>`. Once approved it stays there until the catalogue PR merges (A.6).

## C. Tokens, type, the design system

1. Change `app/globals.css` (both `:root` and `.dark`) and the rule in `DESIGN.md`, in a PR.
2. After the merge, on a clean main:
   - `Artifact read` the design system at `project/tokens.json`, then run
     `node scripts/design-tokens.mjs <saved file>`.
   - Publish with `url` = the design system, `root` = `.design/system`, and
     `file_path` = `.design/system/project/tokens.json`. Follow its type's rules: read `project/design-system.json` right
     before, and send it in the same call with `lastChange` set.
   - Redraw, so the live boards pick up the new stylesheet.
   - Refresh the canvas's copy of the tokens: publish `project/ds/gitranks/tokens.json` as
     `{"artifact": "<design system url>", "path": "project/tokens.json"}`, and set the version in the `designSystems`
     record of `project/canvas.json`.

## D. After any UI PR merges

If it changed a screen in the catalogue, redraw. If it changed a screen's states (a new empty state, a new phone
layout), add them to the catalogue in the same PR.

## Rules

- **Live boards are code.** Never hand-edit `project/current/**`. A wrong live board means a wrong fixture or a missing
  state: fix it in `design/screens/`.
- **One canvas.** Every GitRanks design goes on it: on the To review page while proposed, then on the area's page. Earlier canvases are history, linked from the
  Archive page.
- **Cheap reads.**
  - Read `canvas.json` for positions.
  - Read only the boards you change.
  - Read the screen's source files (listed in its catalogue entry) when you need behaviour.
  - Don't read `gitranks.css` or other screens' boards.
- **The public repo.** `design/` and `DESIGN.md` are public. Proposals and unreleased ideas stay on the canvas. Nothing
  about backends goes in either (AGENTS.md).
- The canvas's own type rules apply to anything you write there (the `.dc.html` shape, the `support.js` line).
  Generated boards already follow them.
