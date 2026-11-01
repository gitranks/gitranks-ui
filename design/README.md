# Designs

Where GitRanks designs live and how to change one. The rules (colour, type, voice) are in [DESIGN.md](../DESIGN.md).
Agents: the `gitranks-design` skill (`.claude/skills/gitranks-design/SKILL.md`) is the step-by-step version of this
page.

## Where things are

| What | Where | Source of truth |
| --- | --- | --- |
| Rules | `DESIGN.md` | this repo |
| Tokens (colour, radius) | `app/globals.css` (`:root`, `.dark`, `@theme inline`) | this repo |
| Components | `components/`, `components/ui/` (stock shadcn), each area's `components/` | this repo |
| Screen catalogue | `design/screens/<area>.tsx`: every screen and the states drawn of it, from fixtures | this repo |
| Live screens, proposals, history | the **GitRanks designs** canvas: https://claude.ai/artifact/WEDFwVR3zHA18J1SgPomVW | live boards: this repo; proposals: the canvas |
| Design system (brand book, tokens, logos) | the **GitRanks** design system: https://claude.ai/artifact/ScFQMUuDsVTPAQMjJTELXU | synced from this repo |

Both links are private to the owner.

## The canvas

One canvas, one page per area (Contribute, …), plus Archive.

- **Live boards** (`project/current/<area>/<screen>--<state>.dc.html`) are drawn from this repo's code by
  `pnpm design:export`: the real components, rendered from fixtures, with the app's own stylesheet
  (`project/current/gitranks.css`). Each screen is a row, titled with its route; its states run left to right. They are
  never edited by hand: they change when the code does.
- **Proposals** (`project/proposals/<slug>/<name>.dc.html`) start as copies of the live boards they change and edit
  only what changes. They sit in the page's proposal column (the grey "Live boards" note names its x) beside the
  screen's row, with a sticky note: what changes, why, the status (Proposed → Approved → Building #PR → Shipped). When
  live rows move or widen, the redraw moves the proposal column's boards and notes with their row.
- **Archive**: a shipped or dropped proposal moves there (its boards' `page` becomes `archive`), so the history stays
  in one place. Older canvases from before this one are linked from there.

## The catalogue

`design/screens/<area>.tsx` lists each screen: its route, the files that draw it, and its states. A state renders the
real screen component with fixtures (the same ones the specs use, under `lib/**/__fixtures__`) at a width (1280, or
390 for a phone) and a board height. `design/screens/index.ts` gathers the areas; `design/registry.ts` has the types.

A screen that isn't in the catalogue yet gets an entry before anyone designs on it. A state is cheap: a fixture and a
render call.

## Commands

| Command | Does |
| --- | --- |
| `pnpm design:export` | Renders every state to `.design/project/current/**` and builds `gitranks.css` (about a second). |
| `node scripts/design-canvas.mjs <canvas.json>` | Merges the export into the canvas's index as read from the canvas: replaces the live boards and their notes (ids starting `current-`), keeps proposals, other notes and pages. Writes `.design/project/canvas.json` and `.design/publish.json` (the files to send). Runs only on a clean checkout of `origin/main`: live boards come from main. |
| `node scripts/design-tokens.mjs <tokens.json>` | The design system's `tokens.json` with every colour from `app/globals.css`, keeping its usage notes and type scale. Writes `.design/system/project/tokens.json`. |

`.design/` is not committed.
