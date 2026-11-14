import type { LearnPromo, LearnPromoIssue, LearnPromoPlacement, LearnRecord } from './learn.types';
import { githubLoginOf } from './learn-path';
import { DEFAULT_LANGUAGE_COLOR } from '@/app/app.consts';
import type { OwnerIssue } from '@/app/profile/[login]/components/profile-contribute-block';
import { isProfileOwner } from '@/lib/contribute/profile-issues';

/**
 * GitRanks Learn suggested to someone it may suit: on the home page in place of Contribute's section, and on their own
 * profile in place of Contribute's block. One suggestion per page; "Not for me" hides them for good.
 */

/** Where the browser asks whether to suggest Learn to the signed-in viewer. */
export const LEARN_PROMO_PATH = '/api/me/learn/promo';

/** A suggestion to show: why it suits the viewer, the language it is about, and up to three issues for the profile. */
export type ShownPromo = { reason: string | null; language: string | null; issues: LearnPromoIssue[] };

/** `GET /api/me/learn/promo`: the suggestion to show, or null for none. */
export type LearnPromoAnswer = { promo: ShownPromo | null };

/** `GET /api/learn/record/<login>`: the login's public Learn record, or null for none. */
export type LearnRecordAnswer = { record: LearnRecord | null };

/** Issues the profile's suggestion lists. */
export const PROMO_ISSUES_SHOWN = 3;

/** `?placement=` as the API's placement; null for anything but `landing` and `profile`. */
export function promoPlacementOf(value: unknown): LearnPromoPlacement | null {
  if (value === 'landing') return 'LANDING';
  if (value === 'profile') return 'PROFILE';
  return null;
}

/**
 * Where the browser asks for the viewer's suggestion: on the home page for any signed-in viewer, on a profile only for
 * its owner. The viewer's login keys the browser's copy, so another sign-in asks anew. Null, nothing asked, otherwise.
 */
export function learnPromoUrl(
  placement: LearnPromoPlacement,
  viewer: string | null | undefined,
  profile?: string | null,
): string | null {
  const login = viewer?.trim();
  if (!login) return null;
  if (placement === 'PROFILE' && !isProfileOwner(login, profile)) return null;
  const query = new URLSearchParams({ placement: placement === 'PROFILE' ? 'profile' : 'landing', login });
  return `${LEARN_PROMO_PATH}?${query}`;
}

/** Where anyone reads a login's Learn record; null for anything that is not a login. */
export function learnRecordUrl(login: string): string | null {
  const id = githubLoginOf(login.trim());
  return id ? `/api/learn/record/${encodeURIComponent(id.toLowerCase())}` : null;
}

const textOf = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

/** An issue as the API answers it, when it has what a row shows: a title, a repository and a number. */
function issueOf(issue: Partial<LearnPromoIssue> | null | undefined): LearnPromoIssue | null {
  const title = textOf(issue?.title);
  const repo = textOf(issue?.repo);
  const number = issue?.number;
  if (!title || !repo || typeof number !== 'number' || !Number.isInteger(number) || number <= 0) return null;
  return { title, repo, number, language: textOf(issue?.language), topic: textOf(issue?.topic) };
}

/**
 * The suggestion to show from the API's answer: only when Learn is open to the viewer and the API says to show one.
 * Null for anything else, an answer without the fields included.
 */
export function shownPromoOf(
  data: { learnOpen?: boolean | null; learnPromo?: Partial<LearnPromo> | null } | null | undefined,
): ShownPromo | null {
  const promo = data?.learnPromo;
  if (data?.learnOpen !== true || promo?.show !== true) return null;
  const issues = (Array.isArray(promo.issues) ? promo.issues : []).flatMap((issue) => issueOf(issue) ?? []);
  return {
    reason: textOf(promo.reason),
    language: textOf(promo.language),
    issues: issues.slice(0, PROMO_ISSUES_SHOWN),
  };
}

const countOf = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0);

/** The record to show: null when there is none, or when it holds no lesson. */
export function learnRecordOf(record: Partial<LearnRecord> | null | undefined): LearnRecord | null {
  const lessons = countOf(record?.lessons);
  if (!lessons) return null;
  const topics = [
    ...new Set((Array.isArray(record?.topics) ? record.topics : []).flatMap((topic) => textOf(topic) ?? [])),
  ];
  return { lessons, topics, prsOpened: countOf(record?.prsOpened), prsMerged: countOf(record?.prsMerged) };
}

/** Topics the record card names; the rest are counted. */
export const RECORD_TOPICS_SHOWN = 5;

/** The topics the card names, and how many more there are. */
export function recordTopicsOf(topics: readonly string[]): { shown: string[]; more: number } {
  const shown = topics.slice(0, RECORD_TOPICS_SHOWN);
  return { shown, more: topics.length - shown.length };
}

/** The suggestion's title: about its language when it has one. */
export const promoTitleOf = (language: string | null): string =>
  language ? `Learn ${language} on real issues` : 'Learn on real open-source issues';

/** The reason as a sentence of its own, ending in a full stop; null without one. */
export function reasonLineOf(reason: string | null): string | null {
  const line = textOf(reason);
  if (!line) return null;
  return /[.!?]$/.test(line) ? line : `${line}.`;
}

/** An issue's language colour, from the profile's own languages; the site's grey for any other. */
export const languageColorOf = (language: string | null, colors: Readonly<Record<string, string>> = {}): string =>
  (language && colors[language.toLowerCase()]) || DEFAULT_LANGUAGE_COLOR;

/** The profile's languages and their colours, keyed by lower-case name, for its issues' rows. */
export function languageColorsOf(
  languages: ReadonlyArray<{ name?: string | null; color?: string | null } | null | undefined>,
): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const language of languages) {
    const name = language?.name?.trim().toLowerCase();
    if (name && language?.color && !colors[name]) colors[name] = language.color;
  }
  return colors;
}

/** An issue of the suggestion as the owner's blocks list it: its issue on GitHub, its language, the lesson's topic. */
export const ownerIssueOf = (issue: LearnPromoIssue, colors?: Readonly<Record<string, string>>): OwnerIssue => ({
  repo: issue.repo,
  number: issue.number,
  url: `https://github.com/${issue.repo}/issues/${issue.number}`,
  title: issue.title,
  language: issue.language ? { name: issue.language, color: languageColorOf(issue.language, colors) } : null,
  why: issue.topic ? `Lesson: ${issue.topic}` : null,
});
