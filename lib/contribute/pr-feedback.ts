import type { Route } from 'next';

import type {
  ContributeHelpedLike,
  ContributePrAction,
  ContributePrCard,
  ContributePrRole,
  ContributeReportReason,
} from './contribute.types';
import { MAINTAINERS_PATH, MAINTAINERS_REPORT_PATH } from './contribute-path';
import { fullDayLabel } from './maintainers-format';

/** A pull request as GitHub names it: `owner/name` and its number. */
export type PrRef = { nameWithOwner: string; number: number };

const OWNER = '[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})';
const NAME = '[A-Za-z0-9._-]{1,100}';
const NUMBER = '[1-9]\\d{0,8}';
const PR_URL = new RegExp(
  `^(?:https?://)?(?:www\\.)?github\\.com/(${OWNER})/(${NAME})/pull/(${NUMBER})(?:[/?#].*)?$`,
  'i',
);
const PR_SHORT = new RegExp(`^(${OWNER})/(${NAME})#(${NUMBER})$`);

/**
 * A pull request link as people paste it: `https://github.com/owner/repo/pull/123` (any tab of it, a query or a
 * hash after it), without the scheme too, or `owner/repo#123`. Null for anything else.
 */
export function parsePrLink(input: string): PrRef | null {
  const text = typeof input === 'string' ? input.trim() : '';
  const match = PR_URL.exec(text) ?? PR_SHORT.exec(text);
  if (!match) return null;
  const [, owner, name, number] = match;
  if (name === '.' || name === '..') return null;
  return { nameWithOwner: `${owner}/${name}`, number: Number(number) };
}

/** `owner/repo#123`, as the API takes it. */
export const prRefText = ({ nameWithOwner, number }: PrRef) => `${nameWithOwner}#${number}`;

/** The pull request on GitHub. */
export const prUrlOf = ({ nameWithOwner, number }: PrRef) => `https://github.com/${nameWithOwner}/pull/${number}`;

export type PrFeedbackFlow = 'report' | 'helped';

/** The report page for one of our PRs: by its footer link (`from`) or by the PR (`pr`), and the flow. */
export function reportPathOf(target: { from: string } | { pr: PrRef }, flow: PrFeedbackFlow = 'report'): Route {
  const query = new URLSearchParams('from' in target ? { from: target.from } : { pr: prRefText(target.pr) });
  if (flow === 'helped') query.set('kind', 'helped');
  return `${MAINTAINERS_REPORT_PATH}?${query}` as Route;
}

/** A section of the maintainers page; with `from`, the page names that PR (and its repo in the badge's Markdown). */
export const maintainersSectionPath = (section: string, from?: string): Route =>
  `${MAINTAINERS_PATH}${from ? `?${new URLSearchParams({ from })}` : ''}#${section}` as Route;

/** The PR an address asks about: its footer link's first attempt, or the PR as `owner/repo#123`. */
export type PrTarget = { from: string } | { pr: PrRef };

const ATTEMPT_ID = /^[a-f\d]{24}$/i;

/** The report page's query as the page reads it: the PR it names, and the flow. Null target for a bad address. */
export function prTargetOf(query: Record<string, string | string[] | undefined>): {
  target: PrTarget | null;
  flow: PrFeedbackFlow;
} {
  const one = (key: string) => {
    const value = query[key];
    return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined;
  };
  const flow: PrFeedbackFlow = one('kind') === 'helped' ? 'helped' : 'report';
  const from = one('from')?.trim();
  if (from && ATTEMPT_ID.test(from)) return { target: { from }, flow };
  const pr = parsePrLink(one('pr') ?? '');
  return { target: pr ? { pr } : null, flow };
}

/** An id the API gave (an attempt's from a footer link's `?from=`, a note's), or null for anything else. */
export const objectIdOf = (value: unknown): string | null =>
  typeof value === 'string' && ATTEMPT_ID.test(value.trim()) ? value.trim() : null;
export const attemptIdOf = objectIdOf;

// ─── Copy ────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const REPORT_REASONS: { value: ContributeReportReason; label: string }[] = [
  { value: 'IGNORES_CONTRIBUTING', label: 'Ignores our contributing rules' },
  { value: 'LOW_QUALITY', label: 'Wrong or low-quality change' },
  { value: 'UNRESPONSIVE', label: 'Author doesn’t respond' },
  { value: 'SPAM_OR_DUPLICATE', label: 'Spam or duplicate' },
  { value: 'OTHER', label: 'Something else' },
];

export const HELPED_LIKES: { value: ContributeHelpedLike; label: string }[] = [
  { value: 'SOLVED_WELL', label: 'Solved the issue well' },
  { value: 'FOLLOWED_RULES', label: 'Followed our contributing rules' },
  { value: 'SMALL_AND_CLEAR', label: 'Small and easy to review' },
  { value: 'GOOD_TESTS', label: 'Good tests' },
  { value: 'ANSWERED_REVIEW', label: 'The author answered our review' },
];

export const likeLabelOf = (like: ContributeHelpedLike) =>
  HELPED_LIKES.find(({ value }) => value === like)?.label ?? like;

/** The role in plain words, never GitHub's permission names. */
export const ROLE_WORDS: Record<ContributePrRole, string> = {
  MAINTAINER: 'Maintainer',
  COLLABORATOR: 'Collaborator',
  USER: 'User',
};

/** The actions a maintainer's report may take at once, as the form offers them. */
export function actionChoicesOf(card: ContributePrCard): { value: ContributePrAction; title: string; text: string }[] {
  const contributor = card.contributorLogin ?? 'this contributor';
  return [
    {
      value: 'STOP_PR',
      title: 'Stop GitRanks work on this PR',
      text: `No more agent commits or replies on #${card.number}. The PR stays open; close it if you like.`,
    },
    {
      value: 'BLOCK_CONTRIBUTOR',
      title: `No more GitRanks PRs from ${contributor} here`,
      text: `In ${card.nameWithOwner} only. Their open PRs stay as they are.`,
    },
    {
      value: 'REPO_OFF',
      title: 'Keep GitRanks out of this repo',
      text: 'Same as contribute: off. No new picks or PRs from anyone.',
    },
  ];
}

/** What an applied action did, as the sent page says it. */
export function appliedActionText(
  kind: ContributePrAction,
  card: Pick<ContributePrCard, 'number' | 'nameWithOwner' | 'contributorLogin'>,
): string {
  switch (kind) {
    case 'STOP_PR':
      return `GitRanks work on #${card.number} stopped: no more agent commits or replies there.`;
    case 'BLOCK_CONTRIBUTOR':
      return `No more GitRanks PRs from ${card.contributorLogin ?? 'this contributor'} in ${card.nameWithOwner}.`;
    case 'REPO_OFF':
      return `GitRanks is out of ${card.nameWithOwner}: no new picks or PRs from anyone.`;
  }
}

/** What an Undo brought back, said in its place. */
export function undoneActionText(
  kind: ContributePrAction,
  card: Pick<ContributePrCard, 'number' | 'nameWithOwner' | 'contributorLogin'>,
): string {
  switch (kind) {
    case 'STOP_PR':
      return `Undone: GitRanks may work on #${card.number} again.`;
    case 'BLOCK_CONTRIBUTOR':
      return `Undone: ${card.contributorLogin ?? 'this contributor'} may open GitRanks PRs in ${card.nameWithOwner} again.`;
    case 'REPO_OFF':
      return `Undone: ${card.nameWithOwner} is opted back in. Its issues may be picked again after the next weekly read.`;
  }
}

/** Who made the change, from the PR footer's words: `Claude (Opus)`, `Claude Code (Opus)`. */
export const agentOf = (agentPhrase: string) =>
  agentPhrase.replace(/^GitRanks Contribute (?:powered by|and)\s+/i, '').trim() || agentPhrase;

/** The PR card's line: `owner/repo#123 · opened Oct 27 by mira-dev · reviewed and submitted by mira-dev · agent: …`. */
export function prCardFacts(card: ContributePrCard): string[] {
  const login = card.contributorLogin;
  const opened = fullDayLabel(card.openedAt).replace(/, \d{4}$/, '');
  return [
    login ? `opened ${opened} by ${login}` : `opened ${opened}`,
    card.reviewed
      ? login
        ? `reviewed and submitted by ${login}`
        : 'reviewed and submitted by its author'
      : login
        ? `opened by ${login}’s autopilot`
        : 'opened by autopilot',
    `agent: ${agentOf(card.agentPhrase)}`,
  ];
}

// ─── The forms ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** The API's limits on a note's text and its reply address. */
export const PR_FEEDBACK_DETAILS_MAX = 2000;
export const PR_FEEDBACK_REPLY_TO_MAX = 200;

/** A plain address check, as the API's: one @, a dot in the domain, no spaces. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PrFeedbackFieldErrors = Partial<Record<'reasons' | 'details' | 'replyTo', string>>;

function textErrors(details: string, replyTo: string): PrFeedbackFieldErrors {
  const errors: PrFeedbackFieldErrors = {};
  if (details.trim().length > PR_FEEDBACK_DETAILS_MAX) {
    errors.details = `At most ${PR_FEEDBACK_DETAILS_MAX.toLocaleString('en-US')} characters.`;
  }
  const address = replyTo.trim();
  if (address && (address.length > PR_FEEDBACK_REPLY_TO_MAX || !EMAIL.test(address))) {
    errors.replyTo = 'Enter an email address, or leave it empty.';
  }
  return errors;
}

/** A report's problems: at least one reason, the details and the address within the API's limits. */
export function reportErrorsOf(input: { reasons: string[]; details: string; replyTo: string }): PrFeedbackFieldErrors {
  return {
    ...(input.reasons.length ? {} : { reasons: 'Pick at least one.' }),
    ...textErrors(input.details, input.replyTo),
  };
}

/** A "this PR helped" note's problems: the word and the address within the API's limits; likes are optional. */
export const helpedErrorsOf = (input: { word: string; replyTo: string }): PrFeedbackFieldErrors =>
  textErrors(input.word, input.replyTo);

export const hasErrors = (errors: PrFeedbackFieldErrors) => Object.keys(errors).length > 0;

/** Text as the API takes it: trimmed, or null when empty. */
export const textOrNull = (value: string) => value.trim() || null;
