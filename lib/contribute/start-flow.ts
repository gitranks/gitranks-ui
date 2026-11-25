import type { ContributeIssuePage, ContributeLanguage } from '@/lib/workspace/contribute.types';
import { LANGUAGES } from '@/lib/workspace/format';
import type { FlowConnected } from '@/lib/workspace/getting-in';
import type { IssuePage } from '@/lib/workspace/masked-issue.types';

/*
 * The second step of Contribute's flow, "Pick your first issue", as words: the head's sentence by what is connected
 * and what the list holds, and the one line on the languages the issues are picked for.
 */

/** What the list holds: issues, the first ones still being picked, or nothing that fits. */
export type FirstIssueState = 'list' | 'picking' | 'none';

const FIT = 'These open issues fit what you work on.';

/**
 * The head's sentence: the own agent by its name (`agent`, "Your agent" when unknown), the Claude key, or both; then
 * what the list holds.
 */
export function firstIssueLineOf(
  connected: FlowConnected,
  agent: string | null,
  state: FirstIssueState = 'list',
): string {
  const both = connected.own && connected.hosted;
  const who = both ? 'Your agents are' : connected.hosted ? 'Your Claude key is' : `${agent || 'Your agent'} is`;
  if (state === 'picking') return `${who} connected. Your first issues are on their way.`;
  if (state === 'none') return `${who} connected, so you are ready when an issue comes.`;
  if (both) return `${who} connected. ${FIT} See one in full, then start it and choose who works on it.`;
  if (connected.hosted)
    return `${who} connected. ${FIT} See one in full, then start it, and the hosted agent begins at once.`;
  return `${who} connected. ${FIT} See one in full, then start it.`;
}

/** "Go", "Go and Rust", "Go, Rust and Python". */
function namesOf(languages: readonly ContributeLanguage[]): string {
  const names = languages.map((language) => LANGUAGES[language] ?? language);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : (names[0] ?? '');
}

/**
 * The line of languages: the saved ones (`saved`, null when nothing is saved), else the profile's, which the line says
 * it took from the GitHub profile. With none known at all, every language.
 */
export type LanguagesLine = { names: string | null; fromProfile: boolean };

export function languagesLineOf(
  saved: readonly ContributeLanguage[] | null,
  profile: readonly ContributeLanguage[],
): LanguagesLine {
  if (saved) return { names: saved.length ? namesOf(saved) : null, fromProfile: false };
  return profile.length ? { names: namesOf(profile), fromProfile: true } : { names: null, fromProfile: false };
}

/** The line as one sentence, before its "Change". */
export const languagesLineText = ({ names, fromProfile }: LanguagesLine): string =>
  names ? `Picked for ${names}${fromProfile ? ', from your GitHub profile' : ''}.` : 'Picked from every language.';

/** The languages "Change" opens with: the saved ones, else the ones the line shows from the profile. */
export const startingLanguagesOf = (
  saved: readonly ContributeLanguage[] | null,
  profile: readonly ContributeLanguage[],
): ContributeLanguage[] => [...(saved ?? profile)];

/** After a save of the languages: how often the list's time is asked, and how long before the list is drawn as it is. */
export const REPICK_POLL_MS = 3_000;
export const REPICK_GIVE_UP_MS = 120_000;

/**
 * Whether the list was picked again since the save: its time (`now`) is later than the one read just before the save
 * (`before`). Both are the server's times; the browser's clock is never compared. With no time before, any time counts.
 */
export function repickedOf(before: string | null, now: string | null): boolean {
  const at = now ? Date.parse(now) : Number.NaN;
  if (Number.isNaN(at)) return false;
  const was = before ? Date.parse(before) : Number.NaN;
  return Number.isNaN(was) || at > was;
}

/**
 * The issue the person opened, as the list under "Or pick another" knows it: its mask id, and while it is held in full
 * its repository and number. It goes to the browser, so the pages read after the first one leave it out too.
 */
export type OpenedIssueKey = { id: string; repo: string | null; number: number | null };

/** The key of the opened issue; null without one. */
export function openedIssueKeyOf(opened: Pick<IssuePage, 'masked' | 'full'> | null | undefined): OpenedIssueKey | null {
  if (!opened?.masked) return null;
  return { id: opened.masked.id, repo: opened.full?.repo ?? null, number: opened.full?.number ?? null };
}

/**
 * A page of the list without the opened issue (`key`), masked (by its mask id) or in full (by its repository and
 * number), its total one fewer for each row left out. The same page when the issue is not on it.
 */
export function withoutOpenedKey<Page extends ContributeIssuePage | null | undefined>(
  page: Page,
  key: OpenedIssueKey | null | undefined,
): Page {
  if (!page || !key) return page;
  const items = page.items.filter(
    (item) =>
      item.masked?.id !== key.id && !(key.repo && item.nameWithOwner === key.repo && item.number === key.number),
  );
  if (items.length === page.items.length) return page;
  return { ...page, items, total: Math.max(0, page.total - (page.items.length - items.length)) };
}

/**
 * The list under "Or pick another": the issue the person opened is drawn above it, so it is left out here, masked (by
 * its mask id) or in full (by its repository and number).
 */
export function withoutOpenedIssue<Page extends ContributeIssuePage | null | undefined>(
  page: Page,
  opened: Pick<IssuePage, 'masked' | 'full'> | null,
): Page {
  return withoutOpenedKey(page, openedIssueKeyOf(opened));
}
