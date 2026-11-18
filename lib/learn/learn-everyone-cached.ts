import 'server-only';

import { cacheLife } from 'next/cache';

import { learnOpenToEveryone } from './learn-everyone';

/**
 * `learnOpenToEveryone` for what renders ahead of a request (the front door's metadata): cached for minutes, so the
 * answer can sit in a prerendered result, and lifting Learn's switch shows within minutes.
 */
export async function learnOpenToEveryoneCached(): Promise<boolean> {
  'use cache';
  cacheLife('minutes');
  return learnOpenToEveryone();
}
