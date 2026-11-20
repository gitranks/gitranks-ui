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

One canvas, one page per area (Landing, Developer profile, Repository, Package, Organization, Rankings, Badges,
Contribute, Workspace, Learn, Admin), plus To review and Archive. Workspace holds the signed-in pages both sides share
(Pull requests, a pull request's page with its Lesson view, Agent, Settings, the Start page, the parts both front tabs
use); Contribute and Learn hold their own tab and their public pages. Each side's way in sits on its page right under
its landing: the flow's steps, one row each (`design/screens/getting-in.tsx`; routes under `/contribute/start` and
`/learn/start`). The Agent tab's "nothing connected" states, for an account that has entered and for one that has not,
are on Workspace with the Agent tab.

- **Live boards** (`project/current/<area>/<screen>--<state>.dc.html`) are drawn from this repo's code by
  `pnpm design:export`: the real components, rendered from fixtures, with the app's own stylesheet
  (`project/current/gitranks.css`). Each screen is a row, titled with its route; its states run left to right. They are
  never edited by hand: they change when the code does.
- **Proposals** (`project/proposals/<slug>/<name>.dc.html`) start as copies of the live boards they change and edit
  only what changes. The status runs Proposed → Approved → Building #PR → Shipped.
  - **While proposed**, they sit on the **To review** page (`review`), one section per proposal. A title note names
    the proposal and the screens it changes. A sticky note says what changes and why, with the status. The redraw
    never moves anything on that page.
  - **Once approved**, the boards and notes move to the area's page, into its proposal column (the grey "Live boards"
    note names its x) beside the screen's row. When live rows move or widen, the redraw moves the proposal column's
    boards and notes with their row.
- **Archive**: a shipped or dropped proposal moves there, so the history stays in one place. Its notes stay; its files
  (boards, frozen badge images, stylesheet copies) leave the canvas, since the shipped screen is now a live board.
  Older canvases from before this one are linked from there.

### The file cap

The canvas holds at most 512 files a version, besides its type's own. Live boards, their images and the stylesheet
take most of them, so:

- Live images are shared by content: each distinct image is one file, named by its hash, whichever boards show it.
- When a proposal ships or is dropped (moves to Archive), its files are removed from the canvas and only its notes
  stay; frozen badge images of archived proposals go with them.
- Aim at 450 files or fewer after a redraw. `pnpm design:export` prints the live file count and
  `scripts/design-canvas.mjs` the canvas's count after the publish; both warn above 450.

## The catalogue

`design/screens/<area>.tsx` lists each screen: its route, the files that draw it, and its states. A state renders the
real screen component with fixtures (the same ones the specs use: `__fixtures__` modules beside the code, and
`badge/v3/fixtures.ts`) at a width (1280, or 390 for a phone) and a board height. `design/screens/index.ts` gathers
the areas; `design/registry.ts` has the types.

A screen that isn't in the catalogue yet gets an entry before anyone designs on it. A state is cheap: a fixture and a
render call. A page that reads its data inside a server component first gets a presentational `…Screen` (or `…Frame`
for a layout) that takes the data as props, so the catalogue renders the same component the page does.

How a state is drawn (`design/setup.tsx`, `design/images.ts`):

- As the server sends it: async server components are awaited, browser-only parts (`ssr: false` charts) are left out,
  and every board and its badges share one clock (28 Oct 2026, 12:00 UTC), with `NEXT_PUBLIC_URI` set as in production.
- Signed in as the catalogue's viewer, or signed out with `signedOut: true`.
- Loaders and server-only modules are mocked; nothing reads the API. A loader a screen calls in the browser is mocked
  to return its fixture.
- Badge images are drawn from badge facts, the way the site's own route draws them, into `project/current/img/`. A
  screen names the facts its badges show with `withBadgeFacts`. Each image is `img/<first 12 hex of its sha256>.svg`,
  written once and shared by every board that shows it; a drawing that changed is a new file. Avatars become
  identicons, since the fixtures' accounts are made up. Any other image stops the export.

## Commands

| Command | Does |
| --- | --- |
| `pnpm design:export` | Renders every state to `.design/project/current/**`, with the badge images the boards show, and builds `gitranks.css` (a few seconds). Prints the live file count. |
| `node scripts/design-canvas.mjs <canvas.json> <files.txt>` | Merges the export into the canvas's index as read from the canvas: replaces the live boards and their notes (ids starting `current-`), keeps proposals, other notes and pages. `files.txt` is the canvas's file listing (`Artifact list`, `scope: "files"`, saved as text): the index has no images, so live files the canvas holds that the export no longer draws are found there and removed. Writes `.design/project/canvas.json` and `.design/publish.json` (the files to send: boards, images, stylesheet, and `null` for each removal), and prints the canvas's file count after the publish. Runs only on a clean checkout of `origin/main`: live boards come from main. |
| `node scripts/design-tokens.mjs <tokens.json>` | The design system's `tokens.json` with every colour from `app/globals.css`, keeping its usage notes and type scale. Writes `.design/system/project/tokens.json`. |

`.design/` is not committed.
