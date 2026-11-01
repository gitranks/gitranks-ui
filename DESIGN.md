# GitRanks design

How gitranks.com looks and reads. The values live in code: colours and radii in `app/globals.css`, components in
`components/` and `app/`. This file holds the rules for using them. How to work on a design (where screens live, how
to propose a change) is in [design/README.md](design/README.md).

GitRanks ranks GitHub developers, organizations, repositories, countries and languages. The interface is a
scoreboard: numbers carry the page, chrome stays quiet, and one violet accent marks the action to take and the data
that belongs to *you*.

## Principles

1. **Numbers first.** A rank, a delta or a count is the headline: JetBrains Mono (`font-mono`), `tabular-nums`. Labels
   shrink to `text-xs`/`text-sm` in `text-muted-foreground`.
2. **One accent, used for meaning.** `primary` (violet) is the one main action per view, focus rings, inline links and
   the viewer's own data (`brand-soft`). Never decoration, never a gradient.
3. **Neutral ground.** Pages sit on `background`; blocks that need separating are `card` with a `border` hairline.
   Shadows only on things that float.
4. **Rank colour is earned.** Tier colours appear only where a tier is named. `positive`/`negative` only on deltas,
   always with ↑/↓ or +/−.
5. **Same edges everywhere.** Header, pages and footer share `max-w-7xl` and the `px-4` gutter.

## Voice and copy

- Plain and specific, second person. Say what the number is: "#102 of 3,303,658 developers by contribution stars",
  not "Great job!".
- Playful only in small, owned places (refresh dialogs, the support banner). Headings, navigation and data stay
  straight.
- Sentence case for buttons, tabs, titles and menu items. Product names keep their case (GitHub, GitRanks).
- Numbers: en-US separators in tables (`1,101,747`), compact in cards (`1.1M`), positions with `#`, percentiles as
  "Top 0.1%", deltas as `↑12` / `↓3` (zero shows nothing). Money `$4.20`.
- Emoji only in social insight posts and country flags. Never in headings, buttons or navigation, never as icons.
- Logins as GitHub writes them, `@` only in running text.

## Colour

Tokens keep shadcn's names, so stock `components/ui` restyle with no edits. Light and dark values are in
`app/globals.css`; `@theme inline` exposes each as a utility (`bg-card`, `text-link`, `bg-tier-7/15`).

- **Text:** `foreground` on `background`/`card`/`popover`; `muted-foreground` for descriptions, timestamps, labels
  (4.5:1 or better on `background`, `card` and `muted` in both themes).
- **Primary:** one button per view, the hero search, the main call to action. In dark, `primary-foreground` is
  near-black.
- **Your data:** `brand-soft` + `brand-soft-foreground` (your rank card, your row, your snippet box).
- **brand-mark:** illustration only (covers, empty states). Never text, never behind text.
- **Links:** `text-link` in running copy, underline on hover. Names and logins in tables use `foreground`; the row is
  the target.
- **Signals:** `positive`/`negative` (and their `-strong` versions on a 10% fill) only on changes. `destructive` is
  for errors and destructive actions, not a falling rank. `warning` + `warning-soft` for notices.
- **Developer tiers:** `tier-1` Rookie (bottom 50%), `tier-2` Skilled (25%), `tier-3` Pro (13%), `tier-4` Expert (6%),
  `tier-5` Master (3%), `tier-6` Elite (2%), `tier-7` Legend (top 1%). Text or icon colour, or a 10–15% fill with the
  `tier-N-strong` text. The tier name is always written next to the colour. Repositories have their own ladder
  (Stardust … Supernova, `app/app.consts.ts`).
- **Charts:** `series-1…8` in that fixed order, then `series-other`, `series-unknown`; `chart-1…5` alias the first
  five. Language colours are GitHub's data, not tokens.
- **Focus:** a visible `ring` on every interactive element.

## Type

- **Inter** for all text, **JetBrains Mono** for ranks, counts, money and code. Twemoji Country Flags sits before Inter
  in `font-sans` so flags render on Windows.
- One heading weight, semibold (600). Bold (700) only for numbers that must out-shout their label.
- Scale (Tailwind): page title `text-3xl`–`text-4xl` (30px on phones), section `text-xl`–`text-2xl`, card title
  `text-base font-semibold`, body `text-sm`–`text-base`, captions `text-xs`. Headings `text-balance`; running text
  under ~70 characters (`max-w-prose`).

## Space and layout

- Tailwind's 4px scale. Page gutter `px-4` at every width; card padding `p-4`, `p-6` on large landing panels.
- Containers: `max-w-7xl` (header, landing, app pages), `max-w-5xl` (leaderboards), `max-w-3xl` (settings, legal,
  methodology).
- Phone below `md` (768px), laptop `lg`–`xl`, desktop `xl`+. Every page works at 375px: menus stack, toolbars wrap,
  wide tables scroll in their own box. Touch targets 44px on phones (`max-sm:min-h-11`).

## Shape and elevation

- Radius base `--radius` (10px): `rounded-sm` chips, `rounded-md` buttons and inputs, `rounded-xl` cards,
  `rounded-full` avatars and pills.
- Borders before shadows: cards are `border` (+ `shadow-sm` in light). `shadow-lg` only for popovers, menus, dialogs.

## Motion

- `tw-animate-css` (`animate-in fade-in slide-in-from-bottom-2`), 150–450ms ease-out, always behind `motion-safe:`.
  Spinners and live dots too. Nothing autoplays under reduced motion.

## Icons and images

- **lucide-react** for interface icons (`size-4` in text and buttons). **react-icons/si** only for third-party brand
  marks. Metric glyphs (star, follower, pull request) are in `components/icons`, in `currentColor`.
- The logo is the podium star (`components/logo`, `public/logo-*.svg`).
- Badges are SVG images for other people's READMEs, rendered under `badge/`: they keep their own schemes and fonts,
  outside these tokens.
- Avatars are round, from GitHub at 2×, with a generated fallback.

## Components

- `components/ui/*` stay stock shadcn: restyle through tokens and call-site classes; pull new variants with
  `npx shadcn add`.
- GitRanks components (`TierChip`, `RankDelta`, `RankCard`, `RankingTable`, the Contribute `Pill`, `Meter`, …) compose
  those primitives. Reuse before adding: search `components/` and the area's `components/` folder first.
- One `primary` button per view; beside it `outline` or `secondary`; `ghost` for icon buttons.
