import type { LearnRecord } from './learn.types';
import { type LearnRecordAnswer, learnRecordOf, learnRecordUrl } from './learn-promo';

/** One JSON read; null on any failure. */
async function read<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** A login's public Learn record, read in the browser; null for none, and on any failure. */
export async function readLearnRecord(login: string): Promise<LearnRecord | null> {
  const url = learnRecordUrl(login);
  if (!url) return null;
  return learnRecordOf((await read<LearnRecordAnswer>(url))?.record);
}
