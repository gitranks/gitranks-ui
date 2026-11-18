import type { NextRequest } from 'next/server';

import { startFollow } from '@/lib/follow/follow-api';
import { startBodyOf } from '@/lib/follow/follow-request';
import { followAnswer, followBodyOf, followCallerOf, followFailure, followRefusalOf } from '@/lib/follow/follow-route';
import { readLinkToken } from '@/lib/link-token/link-cookie';
import { requestMaySeePackages } from '@/lib/packages/packages-gate';

/**
 * One press of Follow, signed in or not: `{ refusal, notHeld, results }`, what became of each package on each channel.
 * Only for a viewer who may see package pages. A browser that opened an email's settings link lately follows at that
 * address with no new confirmation.
 */
export async function POST(req: NextRequest) {
  const refusal = await followRefusalOf(req, { change: true, maySee: requestMaySeePackages });
  if (refusal) return refusal;

  const body = startBodyOf(await followBodyOf(req));
  if (!body) return followFailure('invalid');

  // A settings link opened in this browser lately proves its address: the key goes along from the cookie that link
  // set, read here on the server, and is never put in an answer.
  const manageToken = await readLinkToken('settings');
  return followAnswer(await startFollow(await followCallerOf(req), body, manageToken), (data) => data);
}
