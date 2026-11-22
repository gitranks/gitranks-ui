import type { NextRequest } from 'next/server';

import { startFollow } from '@/lib/follow/follow-api';
import { startBodyOf } from '@/lib/follow/follow-request';
import { followAnswer, followBodyOf, followCallerOf, followFailure, followRefusalOf } from '@/lib/follow/follow-route';

/**
 * One press of Follow, signed in or not: `{ refusal, notHeld, results }`, what became of each package on each channel.
 * Email follows only a signed-in viewer, at the account's verified email.
 */
export async function POST(req: NextRequest) {
  const refusal = followRefusalOf(req, { change: true });
  if (refusal) return refusal;

  const body = startBodyOf(await followBodyOf(req));
  if (!body) return followFailure('invalid');

  return followAnswer(await startFollow(await followCallerOf(req), body), (data) => data);
}
