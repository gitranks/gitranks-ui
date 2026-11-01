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

## A. Change a screen, or design something on an existing one

1. **Find it** in `design/screens/<area>.tsx` by route. Not there? Add the screen, and the states you need, first.
   Render the real `…Screen` component with the fixtures its spec uses, the same way the entries next to it do. Run
   `pnpm design:export` until it passes.
2. **Bring its live boards up to date.** Run `DESIGN_SCREENS=<id> pnpm design:export`. Then `Artifact read` the canvas
   at `project/canvas.json` and run `node scripts/design-canvas.mjs <the saved file>`. Publish:
   `url` = the canvas, `root` = `.design`, `file_path` = `.design/project/canvas.json`, `files` = the map in
   `.design/publish.json`. The `root` must be inside your working directory or scratchpad: if you run outside
   gitranks-ui, copy `.design` to the scratchpad first. If a publish is refused because of files you haven't read,
   read each one (`action: read`, its `path`) and publish again.
3. **Read only that screen's boards.** `Artifact read` `project/current/<area>/<id>--<state>.dc.html` for the states
   your change touches.
4. **Propose by editing copies.** Copy each board you change to `.design/project/proposals/<slug>/<name>.dc.html` and
   edit only what changes. Keep the app's classes: they come from `gitranks.css`. Inline `style` is fine for something
   new. Then fix the stylesheet link for the new depth: `../../current/gitranks.css`.
   - Give options as extra boards (A, B), not as flags.
   - Place the boards on the screen's page, to the right of its row: `x` from 4000, the row's `y`.
   - Add a sticky note: what changes, why, and `Status: Proposed`.
   - Publish only the new files and the index. Read the index right before, and change only your entries.
5. **Review.** The owner comments on the canvas. Revise the proposal boards, never the live ones.
6. **Build** in code once it's approved. Set the note to `Building #<PR>`.
7. **After the merge,** redraw the screen (step 2). Then move the proposal's boards to the `archive` page: set their
   `page`, and set the note to `Shipped #<PR>`.

## B. A new screen

Add it to the catalogue as soon as it has a component. Until then, start from the nearest live board: copy it to
`proposals/<slug>/` and keep its header, tabs and container. Never start from a blank board. Put it on the area's page
under a title note `New: <name>`.

## C. Tokens, type, the design system

1. Change `app/globals.css` (both `:root` and `.dark`) and the rule in `DESIGN.md`, in a PR.
2. After the merge:
   - `Artifact read` the design system at `project/tokens.json` and run `node scripts/design-tokens.mjs <saved file>`.
   - Publish `.design/system/project/tokens.json` to the design system. Follow its type's rules: read
     `project/design-system.json` right before, and send it last with `lastChange`.
   - Redraw the screens (A2 without `DESIGN_SCREENS`) so the live boards pick up the new stylesheet.
   - Refresh the canvas's copy of the tokens: publish `project/ds/gitranks/tokens.json` as
     `{"artifact": "<design system url>", "path": "project/tokens.json"}`, and set the version in its
     `designSystems` record.

## D. After any UI PR merges

If it changed a screen in the catalogue, redraw that screen (A2). If it changed a screen's states (new empty state,
new phone layout), add them to the catalogue in the same PR.

## Rules

- **Live boards are code.** Never hand-edit `project/current/**`. A wrong live board means a wrong fixture or a missing
  state: fix it in `design/screens/`.
- **One canvas.** Every GitRanks design goes on it, on the area's page. Earlier canvases are history, linked from the
  Archive page.
- **Cheap reads.**
  - Read `canvas.json` for positions.
  - Read only the boards you change.
  - Read the screen's source files (listed in its catalogue entry) when you need behaviour.
  - Don't read `gitranks.css` or the boards of other screens.
- **The public repo.** `design/` and `DESIGN.md` are public. Proposals and unreleased ideas stay on the canvas.
  Nothing about backends goes in either (AGENTS.md).
- The canvas's own type rules apply to anything you write there: `.dc.html` shape, `support.js` line, and so on.
  Generated boards already follow them.
