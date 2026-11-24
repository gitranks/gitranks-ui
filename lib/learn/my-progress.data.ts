import 'server-only';

import { fixesCached } from './issues.data';
import { isLearnDay, type LearnHistory, type LearnMyProgress } from './my-progress';
import {
  LearnHistoryDocument,
  LearnHistoryFixesDocument,
  LearnMyFixesDocument,
  LearnMyProgressDocument,
  LearnMyProgressFixesDocument,
  LearnMyWalkthroughsDocument,
  LearnProgressIssuesDocument,
} from './my-progress.documents';
import {
  dayFixesOf,
  type LearnDayFixes,
  type MyFixRow,
  type MyWalkthroughRow,
  myFixesOf,
  myWalkthroughsOf,
  type NoFixEnd,
  withDayFixes,
} from './my-progress-fixes';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ContributeEmailSettingsDocument } from '@/lib/workspace/contribute.documents';

/*
 * My progress, read for the signed-in person alone, in the browser through its routes, and never kept: every answer
 * changes it. The reads of real fixes are each their own operation with a time limit: a slow or failed one, or an API
 * that does not know it yet, leaves the page as it draws without it.
 */

/** How long a read of real fixes is waited for: a slower one is drawn without, as a failed one is. */
export const MY_PROGRESS_FIXES_TIMEOUT_MS = 3_000;

const limitedAs = (githubLogin: string) => ({
  source: 'ssr' as const,
  githubLogin,
  signal: AbortSignal.timeout(MY_PROGRESS_FIXES_TIMEOUT_MS),
});

const isCount = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

/** An answer the page can draw: the counts are numbers and the lists are lists. */
function isMyProgress(value: LearnMyProgress | null | undefined): value is LearnMyProgress {
  return (
    !!value &&
    [value.learned, value.practised, value.mastered, value.known, value.activeDays].every(isCount) &&
    Array.isArray(value.days) &&
    Array.isArray(value.courses)
  );
}

/** What each day of the last 26 weeks gains from real fixes; null on any failure. */
async function loadProgressDayFixes(githubLogin: string): Promise<Map<string, LearnDayFixes> | null> {
  try {
    const { learnMyProgress } = await graphqlDirect(LearnMyProgressFixesDocument, {}, limitedAs(githubLogin));
    return dayFixesOf(learnMyProgress?.days);
  } catch {
    return null;
  }
}

/**
 * The person's progress, its days with their fixes merged and walkthroughs passed when that read answers in time: null
 * when Learn is not open to them, and on any failure or an answer it cannot draw.
 */
export async function loadLearnMyProgress(githubLogin: string): Promise<LearnMyProgress | null> {
  const fixes = loadProgressDayFixes(githubLogin);
  try {
    const { learnMyProgress } = await graphqlDirect(LearnMyProgressDocument, {}, { source: 'ssr', githubLogin });
    if (!isMyProgress(learnMyProgress)) return null;
    return { ...learnMyProgress, days: withDayFixes(learnMyProgress.days, await fixes) };
  } catch {
    return null;
  }
}

/**
 * The time zone the person saved, which Learn counts their days in: `{ timeZone: null }` when they saved none. Null when
 * it cannot be read (the read failed, or the API does not answer it for this person): the page cannot know the zone.
 */
export async function loadLearnTimeZone(githubLogin: string): Promise<{ timeZone: string | null } | null> {
  try {
    const { contributeEmailSettings } = await graphqlDirect(
      ContributeEmailSettingsDocument,
      {},
      { source: 'ssr', githubLogin },
    );
    if (!contributeEmailSettings) return null;
    const { timeZone } = contributeEmailSettings;
    return { timeZone: typeof timeZone === 'string' && timeZone ? timeZone : null };
  } catch {
    return null;
  }
}

/** What each day of a page of History gains from real fixes; null on any failure. */
async function loadHistoryDayFixes(
  githubLogin: string,
  before: string | null,
): Promise<Map<string, LearnDayFixes> | null> {
  try {
    const { learnHistory } = await graphqlDirect(LearnHistoryFixesDocument, { before }, limitedAs(githubLogin));
    return dayFixesOf(learnHistory?.days);
  } catch {
    return null;
  }
}

/**
 * A page of the person's History, the days before `before` (none: the newest), with their fixes merged and walkthroughs
 * passed when that read answers in time. Null when Learn is not open to them, on any failure, and for a `before` that is
 * not a date: the API is not asked then.
 */
export async function loadLearnHistory(githubLogin: string, before: string | null): Promise<LearnHistory | null> {
  if (before !== null && !isLearnDay(before)) return null;
  const fixes = loadHistoryDayFixes(githubLogin, before);
  try {
    const { learnHistory } = await graphqlDirect(LearnHistoryDocument, { before }, { source: 'ssr', githubLogin });
    if (!learnHistory || !Array.isArray(learnHistory.days) || typeof learnHistory.more !== 'boolean') return null;
    return { days: withDayFixes(learnHistory.days, await fixes), more: learnHistory.more };
  } catch {
    return null;
  }
}

const NO_FIX_END: NoFixEnd = { openIssues: null, email: null };

/** "Your fixes" with nothing in it: the open issues that fit the person, and their list's email; none on a failure. */
async function loadNoFixEnd(githubLogin: string): Promise<NoFixEnd> {
  try {
    const { learnHome } = await graphqlDirect(LearnProgressIssuesDocument, {}, limitedAs(githubLogin));
    const count = learnHome?.thirdBox?.openIssues;
    const issues = learnHome?.issues;
    return {
      openIssues: typeof count === 'number' && Number.isFinite(count) && count > 0 ? Math.floor(count) : null,
      email:
        typeof issues?.emailOn === 'boolean'
          ? {
              emailOn: issues.emailOn,
              emailTo: typeof issues.emailTo === 'string' && issues.emailTo ? issues.emailTo : null,
            }
          : null,
    };
  } catch {
    return NO_FIX_END;
  }
}

/**
 * "Your fixes": every pull request of the person's that Learn opened, newest first, and with none what the empty end
 * needs. Null fixes when Learn is not open to them, on any failure, and when the API does not answer the read in time.
 */
export async function loadLearnMyFixes(githubLogin: string): Promise<{ fixes: MyFixRow[] | null; end: NoFixEnd }> {
  let fixes: MyFixRow[] | null;
  try {
    const { learnMyFixes } = await graphqlDirect(LearnMyFixesDocument, {}, limitedAs(githubLogin));
    fixes = myFixesOf(learnMyFixes);
  } catch {
    fixes = null;
  }
  return { fixes, end: fixes?.length === 0 ? await loadNoFixEnd(githubLogin) : NO_FIX_END };
}

/** How many merged fixes have a walkthrough, the same for everyone; null for none, and on any failure. */
async function loadFixesWithWalkthrough(): Promise<number | null> {
  try {
    const fixes = await fixesCached(null, null, null, null);
    return fixes?.total ? fixes.total : null;
  } catch {
    return null;
  }
}

/**
 * "Walkthroughs": the walkthroughs of other people's fixes the person passed, newest first, and with none how many
 * merged fixes have one. Null walkthroughs as `loadLearnMyFixes` has null fixes.
 */
export async function loadLearnMyWalkthroughs(
  githubLogin: string,
): Promise<{ walkthroughs: MyWalkthroughRow[] | null; fixes: number | null }> {
  let walkthroughs: MyWalkthroughRow[] | null;
  try {
    const { learnMyWalkthroughs } = await graphqlDirect(LearnMyWalkthroughsDocument, {}, limitedAs(githubLogin));
    walkthroughs = myWalkthroughsOf(learnMyWalkthroughs);
  } catch {
    walkthroughs = null;
  }
  return { walkthroughs, fixes: walkthroughs?.length === 0 ? await loadFixesWithWalkthrough() : null };
}
