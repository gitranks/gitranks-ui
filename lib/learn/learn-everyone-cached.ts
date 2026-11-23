import 'server-only';

import { cacheLife } from 'next/cache';

import { learnOpenToEveryoneKnown } from './learn-everyone';

/** The API's real answer, kept for minutes; a failure (no real answer yet) is thrown, and so never kept. */
async function knownCached(): Promise<boolean> {
  'use cache';
  cacheLife('minutes');
  return learnOpenToEveryoneKnown();
}

/**
 * `learnOpenToEveryone` for what renders ahead of a request (the "do not index" marks of Learn's public pages): the
 * API's answer cached for minutes, so it can sit in a prerendered result, and lifting Learn's switch shows within
 * minutes. While the API has not answered yet (a slow or failed first ask), closed for this render only: that guess is
 * never kept, so the next render asks again.
 */
export async function learnOpenToEveryoneCached(): Promise<boolean> {
  try {
    return await knownCached();
  } catch {
    return false;
  }
}
