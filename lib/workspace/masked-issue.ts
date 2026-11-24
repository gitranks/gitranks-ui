import type { Route } from 'next';

import type { ContributeIssueSize } from './contribute.types';
import type { IssueHint, IssueLooksToday, IssueNumbers, IssueOutReason } from './masked-issue.types';
import { REPO_TIER_NAMES, TIER_NAMES } from '@/app/app.consts';
import { languageColorOf } from '@/utils/language-colors';

/**
 * The words of a masked issue, its page and the window that says why details are hidden: one place, so the row, the
 * page and their specs read the same sentences.
 */

/** How long a full issue is held for the person who pressed "See the full issue". */
export const HOLD_MINUTES = 15;
/** The longest note the page takes after giving an issue back. */
export const OUT_NOTE_MAX = 1_000;
/** The longest request to look again at a closed access. */
export const APPEAL_MAX = 2_000;
/** Hints a masked row shows at most. */
export const HINTS_SHOWN = 2;

/** The page of one issue, by its mask id: the address names no project. */
export const issuePagePath = (id: string): Route => `/my/issues/${encodeURIComponent(id)}` as Route;

/** A mask id as the API writes it: short, letters, digits, `_` and `-`. Anything else names no issue. */
const MASK_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** The mask id in an address or an argument; null for anything else. */
export const maskIdOf = (value: unknown): string | null =>
  typeof value === 'string' && MASK_ID.test(value) ? value : null;

/** The list a person came from, which the page's words, form and back link follow. */
export type IssuePageFrom = 'learn' | 'contribute';

/** `?from=learn` from Learn's lists, when Learn is open to the person; Contribute's otherwise. */
export const issuePageFromOf = (value: unknown, learnOpen: boolean): IssuePageFrom =>
  value === 'learn' && learnOpen ? 'learn' : 'contribute';

/** The list as the API names it, for a look and its count. */
export const issueSurfaceOf = (from: IssuePageFrom): 'LEARN' | 'CONTRIBUTE' =>
  from === 'learn' ? 'LEARN' : 'CONTRIBUTE';

/** The parameter a sign-in's return carries: the person pressed "See the full issue" before signing in. */
export const ISSUE_LOOK_PARAM = 'look';

/** The page of one issue with where the person came from, and (back from the sign-in) the press they made. */
export function issuePageHrefOf(id: string, from: IssuePageFrom, pressed = false): Route {
  const query = new URLSearchParams({ from });
  if (pressed) query.set(ISSUE_LOOK_PARAM, '1');
  return `${issuePagePath(id)}?${query}` as Route;
}

/**
 * The page of one issue a new account was on when it was sent to Contribute's home to be set up (`?issue=` with
 * `from` and `look`, as `settingUpHomeOf` carries them): where the home sends it back once ready. Null for none.
 */
export function issuePageCarriedOf(query: Record<string, string | string[] | undefined>): Route | null {
  const id = maskIdOf(query.issue);
  return id ? issuePageHrefOf(id, query.from === 'learn' ? 'learn' : 'contribute', query.look === '1') : null;
}

/** The kinds of issue, the icon each one has in the row, and its name. */
export const ISSUE_KINDS = {
  bug: 'Bug',
  feature: 'Feature',
  docs: 'Docs',
  tests: 'Tests',
  refactor: 'Refactor',
  performance: 'Performance',
} as const;

export type IssueKind = keyof typeof ISSUE_KINDS;

/** A kind as the API writes it ("bug", "BUG", "Tests"), as the row names it; null for one it does not know. */
export function issueKindOf(kind: string | null | undefined): IssueKind | null {
  const key = kind?.trim().toLowerCase();
  return key && key in ISSUE_KINDS ? (key as IssueKind) : null;
}

/** The size letter's word, for its title: "small", "medium", "large". */
export const SIZE_WORDS: Record<ContributeIssueSize, string> = { S: 'small', M: 'medium', L: 'large' };

/** GitHub's colours for the languages issues come in, keyed by lower-case name: the fallback under the viewer's own. */
const GITHUB_LANGUAGE_COLORS: Readonly<Record<string, string>> = {
  typescript: '#3178c6',
  javascript: '#f1e05a',
  python: '#3572a5',
  go: '#00add8',
  rust: '#dea584',
  java: '#b07219',
  php: '#4f5d95',
  ruby: '#701516',
  kotlin: '#a97bff',
  swift: '#f05138',
  'c#': '#178600',
  'c++': '#f34b7d',
  c: '#555555',
  dart: '#00b4ab',
  elixir: '#6e4a7e',
  scala: '#c22d40',
  shell: '#89e051',
  vue: '#41b883',
};

/** An issue's language colour: the viewer's own colours first, then GitHub's, then the site's grey. */
export const issueLanguageColorOf = (language: string | null, colors: Readonly<Record<string, string>> = {}): string =>
  languageColorOf(language, { ...GITHUB_LANGUAGE_COLORS, ...colors });

/** A repository tier's name, 1 Stardust to 7 Supernova; null for none. */
export const projectTierNameOf = (tier: number | null | undefined): string | null =>
  tier && tier >= 1 && tier <= REPO_TIER_NAMES.length ? REPO_TIER_NAMES[tier - 1] : null;

/** One hint in words: always a good sign. */
export function hintTextOf(hint: IssueHint): string {
  switch (hint.kind) {
    case 'AGREED':
      return 'A maintainer agreed it should be fixed';
    case 'MERGES_OUTSIDE':
      return 'Merges outside pull requests';
    case 'MERGED_HERE':
      if (!hint.count) return 'Fixes merged here through GitRanks';
      return `${hint.count} ${hint.count === 1 ? 'fix' : 'fixes'} merged here through GitRanks`;
  }
}

/** The hints a row shows: the first two the API sends, in its order. */
export const hintsShownOf = (hints: readonly IssueHint[]): IssueHint[] => hints.slice(0, HINTS_SHOWN);

/** "18.4k stars", "1 star"; null when not known. */
export function starsTextOf(stars: number | null | undefined): string | null {
  if (stars == null || stars < 0) return null;
  const count =
    stars < 1000
      ? String(stars)
      : new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(stars).toLowerCase();
  return `${count} ${stars === 1 ? 'star' : 'stars'}`;
}

const count = new Intl.NumberFormat('en-US');

/** "You can see 20 full issues a day. 17 left today." */
export function looksLineOf(looks: IssueLooksToday): string {
  return `You can see ${count.format(looks.limit)} full ${looks.limit === 1 ? 'issue' : 'issues'} a day. ${count.format(Math.max(0, looks.left))} left today.`;
}

/** The line under a list for a visitor, who sees issues in full once signed in. */
export const VISITOR_LOOKS_LINE = 'Seeing an issue in full needs a GitHub sign-in. It costs no money.';

/**
 * The line above Contribute's list: the day's full issues, what they are made of, and how many are left.
 * "You can see 20 full issues a day: your GitRanks tier (Skilled) gives 20, and every pull request merged through
 * GitRanks adds 5, up to 100. 17 left today."
 */
export function looksLongLineOf(looks: IssueLooksToday): string {
  const left = `${count.format(Math.max(0, looks.left))} left today.`;
  if (looks.warned) return `After a fair-use warning you can see ${looks.limit} full issues a day. ${left}`;
  const tier = looks.tier ? TIER_NAMES[looks.tier - 1] : null;
  const from = tier
    ? `your GitRanks tier (${tier}) gives ${looks.base}`
    : `an account without a GitRanks tier gets ${looks.base}`;
  const head = `You can see ${looks.limit} full issues a day: ${from}`;
  const rule = 'pull request merged through GitRanks adds 5, up to 100.';
  if (!looks.merged) return `${head}, and every ${rule} ${left}`;
  const added = looks.limit - looks.base;
  const merged = `your ${looks.merged} merged pull ${looks.merged === 1 ? 'request adds' : 'requests add'} ${added}`;
  return `${head}, and ${merged}. Every ${rule} ${left}`;
}

/** The row's note at the day's limit. */
export const limitNoteOf = (looks: Pick<IssueLooksToday, 'limit'>): string =>
  `You have seen ${looks.limit} full ${looks.limit === 1 ? 'issue' : 'issues'} today. More at 00:00 UTC.`;

/** The page's end at the day's limit: its heading and its sentence. */
export function limitEndOf(looks: IssueLooksToday): { title: string; text: string } {
  const title = `You have seen ${looks.limit} full ${looks.limit === 1 ? 'issue' : 'issues'} today`;
  const after = 'You can see more after 00:00 UTC.';
  if (looks.warned) return { title, text: `A fair-use warning holds you at ${looks.limit} a day. ${after}` };
  const tier = looks.tier ? TIER_NAMES[looks.tier - 1] : null;
  const rule = 'Every pull request merged through GitRanks adds 5 a day, up to 100.';
  if (looks.merged) {
    const prs = `${looks.merged} merged pull ${looks.merged === 1 ? 'request adds' : 'requests add'}`;
    const from = tier
      ? `Your GitRanks tier, ${tier}, gives ${looks.base}`
      : `An account without a GitRanks tier gets ${looks.base}`;
    return { title, text: `${from}, and your ${prs} ${looks.limit - looks.base}. ${after} ${rule}` };
  }
  const most = tier
    ? `That is the most for your GitRanks tier, ${tier}.`
    : 'That is the most for an account without a GitRanks tier.';
  return { title, text: `${most} ${after} ${rule}` };
}

/** Whole minutes left until `until`, rounded up; 0 once it is past. */
export const minutesLeftOf = (until: string | Date, now: Date): number =>
  Math.max(0, Math.ceil((new Date(until).getTime() - now.getTime()) / 60_000));

const minutes = (left: number) => `${left} ${left === 1 ? 'minute' : 'minutes'}`;

/** A time of day as the page shows it, "14:32", in the viewer's zone (or the one given). */
export const clockOf = (at: string | Date, timeZone?: string): string =>
  new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(
    new Date(at),
  );

/** The strip over a held issue: "Held for you until 14:32 · 14 minutes left". */
export function heldLineOf(until: string, now: Date, timeZone?: string): string {
  return `Held for you until ${clockOf(until, timeZone)} · ${minutes(minutesLeftOf(until, now))} left`;
}

/** The strip before the page knows the viewer's zone: "Held for you · 14 minutes left". */
export const heldMinutesLineOf = (until: string, now: Date): string =>
  `Held for you · ${minutes(minutesLeftOf(until, now))} left`;

/** The line under the button before the press, holding another issue or not. */
export function beforePressLineOf(holding: { until: string } | null, now: Date): string {
  if (!holding) return `Held for you for ${HOLD_MINUTES} minutes. You can give it back at any time.`;
  const left = minutesLeftOf(holding.until, now);
  return `You hold another issue for ${left} more ${left === 1 ? 'minute' : 'minutes'}. Seeing this one gives that one back.`;
}

/** The row's note while the person holds another issue. */
export const HOLDING_NOTE = 'Seeing this one gives back the issue you hold now.';
/** The row's note when someone pressed a moment before. */
export const TAKEN_NOTE = 'Someone else is looking at this one right now.';

/** The reasons offered after giving an issue back, in their order, and their words. */
export const GIVE_BACK_REASONS: { reason: IssueOutReason; text: string }[] = [
  { reason: 'TAKEN', text: 'Someone is already working on it' },
  { reason: 'FIXED', text: 'It is already fixed' },
  { reason: 'NOT_MY_PROJECT', text: 'Not a project for me' },
  { reason: 'TOO_HARD', text: 'Too hard for me' },
  { reason: 'UNCLEAR', text: 'The issue is not clear' },
  { reason: 'WRONG_MATCH', text: 'Wrong language or lesson' },
];

/** The two reasons a person can give for a skip without seeing the issue. */
export const SKIP_REASONS: { reason: IssueOutReason; text: string }[] = [
  { reason: 'TOO_HARD', text: 'Too hard for me' },
  { reason: 'NOT_INTERESTING', text: 'Not interesting to me' },
];

/**
 * The window's opening sentence, from the numbers of a night: "We read 2,707,100 open issues and kept 3,138 of them:
 * about 1 in 1,000." The share reads "about 1 in 1,000" while it is between 0.05% and 0.2%, else the percent itself.
 * Without numbers (not read yet) it says how issues are chosen without them.
 */
export function numbersLineOf(numbers: Pick<IssueNumbers, 'read' | 'kept'> | null): string {
  const how = 'Our own rules look first, then two AI models, Jev and Claude.';
  if (!numbers || numbers.read <= 0) return `We read open issues and keep very few of them. ${how}`;
  const share = numbers.kept / numbers.read;
  const shareText =
    share >= 0.0005 && share <= 0.002
      ? 'about 1 in 1,000'
      : `${new Intl.NumberFormat('en-US', { maximumSignificantDigits: 2 }).format(share * 100)}%`;
  return `We read ${count.format(numbers.read)} open issues and kept ${count.format(numbers.kept)} of them: ${shareText}. ${how}`;
}

/** The window's three reasons, in their order. */
export const WHY_HIDDEN_REASONS = [
  {
    id: 'cost',
    title: 'Finding them costs us a lot',
    text: 'Bots and unfair accounts copy an open list and use it to farm contributions.',
  },
  {
    id: 'promise',
    title: 'We made a promise to maintainers',
    text: 'One pull request at a time in a project. Bots with the cheapest models send junk nobody reviewed to the same issues, and then we cannot keep it.',
  },
  {
    id: 'fair',
    title: 'It is fair to you',
    text: 'An issue you see is one you can really take, not one that ten people and bots are already racing for.',
  },
] as const;

/** The window's closing sentence. */
export const WHY_HIDDEN_CLOSING = `So you see the project and the real issue only when you ask for it. It is then held for you for ${HOLD_MINUTES} minutes while you decide. Seeing it costs no money, and it counts toward the full issues you can see in a day.`;

/** The words of a closed access, which the request to look again sits under. */
export const BAN_TEXT =
  'Your access to real issues on GitRanks is closed. If you think this is wrong, ask us to look again.';
