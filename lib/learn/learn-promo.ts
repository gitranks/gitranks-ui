import type { LearnRecord } from './learn.types';
import { githubLoginOf } from './learn-path';
import { languageColorOf, languageColorsOf } from '@/utils/language-colors';

/* A login's public Learn record, for the card on their profile, and the language colours the profile uses. */

/** `GET /api/learn/record/<login>`: the login's public Learn record, or null for none. */
export type LearnRecordAnswer = { record: LearnRecord | null };

/** Where anyone reads a login's Learn record; null for anything that is not a login. */
export function learnRecordUrl(login: string): string | null {
  const id = githubLoginOf(login.trim());
  return id ? `/api/learn/record/${encodeURIComponent(id.toLowerCase())}` : null;
}

const textOf = (value: unknown): string | null => (typeof value === 'string' && value.trim() ? value.trim() : null);

const countOf = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0);

/** The record to show: null when there is none, or when it holds no lesson. */
export function learnRecordOf(record: Partial<LearnRecord> | null | undefined): LearnRecord | null {
  const lessons = countOf(record?.lessons);
  if (!lessons) return null;
  const topics = [
    ...new Set((Array.isArray(record?.topics) ? record.topics : []).flatMap((topic) => textOf(topic) ?? [])),
  ];
  return {
    login: textOf(record?.login),
    lessons,
    newThings: countOf(record?.newThings),
    topics,
    prsOpened: countOf(record?.prsOpened),
    prsMerged: countOf(record?.prsMerged),
    reposHelped: countOf(record?.reposHelped),
  };
}

/** Topics the record card names; the rest are counted. */
export const RECORD_TOPICS_SHOWN = 5;

/** The topics the card names, and how many more there are. */
export function recordTopicsOf(topics: readonly string[]): { shown: string[]; more: number } {
  const shown = topics.slice(0, RECORD_TOPICS_SHOWN);
  return { shown, more: topics.length - shown.length };
}

export { languageColorOf, languageColorsOf };
