import 'server-only';

import { isLearnDay, type LearnHistory, type LearnMyProgress } from './my-progress';
import { LearnHistoryDocument, LearnMyProgressDocument } from './my-progress.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ContributeEmailSettingsDocument } from '@/lib/workspace/contribute.documents';

/*
 * My progress, read for the signed-in person alone, in the browser through its routes, and never kept: every answer
 * changes it.
 */

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

/** The person's progress: null when Learn is not open to them, and on any failure or an answer it cannot draw. */
export async function loadLearnMyProgress(githubLogin: string): Promise<LearnMyProgress | null> {
  try {
    const { learnMyProgress } = await graphqlDirect(LearnMyProgressDocument, {}, { source: 'ssr', githubLogin });
    return isMyProgress(learnMyProgress) ? learnMyProgress : null;
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

/**
 * A page of the person's History, the days before `before` (none: the newest). Null when Learn is not open to them,
 * on any failure, and for a `before` that is not a date: the API is not asked then.
 */
export async function loadLearnHistory(githubLogin: string, before: string | null): Promise<LearnHistory | null> {
  if (before !== null && !isLearnDay(before)) return null;
  try {
    const { learnHistory } = await graphqlDirect(LearnHistoryDocument, { before }, { source: 'ssr', githubLogin });
    return learnHistory && Array.isArray(learnHistory.days) && typeof learnHistory.more === 'boolean'
      ? learnHistory
      : null;
  } catch {
    return null;
  }
}
