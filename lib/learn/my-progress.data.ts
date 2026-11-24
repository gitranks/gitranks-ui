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

/** The most errors a log line names, and its length. */
const FAULT_ERRORS = 3;
const FAULT_LENGTH = 300;
/** The codes whose message is the API's fixed words about the query, never a value it was given. */
const MESSAGE_CODES: ReadonlySet<string> = new Set(['GRAPHQL_PARSE_FAILED', 'GRAPHQL_VALIDATION_FAILED']);
const MESSAGE_LENGTH = 120;

type ApiError = { message?: unknown; path?: unknown; extensions?: { code?: unknown } };

/** One error as `path [CODE]`, with its message cut short only for a code whose message carries no value. */
function errorFaultOf(error: ApiError): string {
  const path = Array.isArray(error.path) ? error.path.join('.') : '(no path)';
  const code = typeof error.extensions?.code === 'string' ? error.extensions.code : 'NO_CODE';
  const words = MESSAGE_CODES.has(code) ? `: ${String(error.message).slice(0, MESSAGE_LENGTH)}` : '';
  return `${path} [${code}]${words}`;
}

/**
 * A failed read in one short line: the API's errors by path and code (the first three, then how many more), else the
 * request's own message. No server message that could quote a value, so nothing of the person.
 */
export function readFaultOf(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  let line = message;
  try {
    const errors = JSON.parse(message) as ApiError[];
    if (Array.isArray(errors) && errors.length) {
      const named = errors.slice(0, FAULT_ERRORS).map(errorFaultOf).join('; ');
      line = errors.length > FAULT_ERRORS ? `${named} (+${errors.length - FAULT_ERRORS} more)` : named;
    }
  } catch {
    // Not the API's errors: the request's message as it is.
  }
  return line.slice(0, FAULT_LENGTH);
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
