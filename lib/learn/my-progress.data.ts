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

const COUNTS = ['learned', 'practised', 'mastered', 'known', 'activeDays'] as const;

/**
 * Why the page cannot draw an answer: none came, a count is not a number, or a list is not a list. Null for an answer
 * it can draw.
 */
export function myProgressFaultOf(value: LearnMyProgress | null | undefined): string | null {
  if (!value) return 'no answer';
  const count = COUNTS.find((key) => !isCount(value[key]));
  if (count) return `${count} is not a number`;
  if (!Array.isArray(value.days)) return 'days is not a list';
  if (!Array.isArray(value.courses)) return 'courses is not a list';
  return null;
}

/** A failed read's errors as `path: message`, the API's own words; else the error's message. Nothing of the person. */
export function readFaultOf(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  try {
    const errors = JSON.parse(message) as { message?: unknown; path?: unknown }[];
    if (Array.isArray(errors) && errors.length) {
      return errors
        .map((each) => `${Array.isArray(each.path) ? each.path.join('.') : '(no path)'}: ${String(each.message)}`)
        .join('; ');
    }
  } catch {
    // Not the API's errors: the message as it is.
  }
  return message.slice(0, 300);
}

/**
 * The person's progress: null when Learn is not open to them, and on any failure or an answer it cannot draw, each
 * logged with what went wrong, so "Your progress did not load" can be traced.
 */
export async function loadLearnMyProgress(githubLogin: string): Promise<LearnMyProgress | null> {
  try {
    const { learnMyProgress } = await graphqlDirect(LearnMyProgressDocument, {}, { source: 'ssr', githubLogin });
    const fault = myProgressFaultOf(learnMyProgress);
    if (!fault) return learnMyProgress;
    console.warn(`My progress not drawn: ${fault}`);
    return null;
  } catch (error) {
    console.warn(`My progress read failed: ${readFaultOf(error)}`);
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
