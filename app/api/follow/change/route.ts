import type { NextRequest } from 'next/server';

import { changeFollow } from '@/lib/follow/follow-api';
import { changeBodyOf } from '@/lib/follow/follow-request';
import { followAnswer, followBodyOf, followCallerOf, followFailure, followRefusalOf } from '@/lib/follow/follow-route';
import { requestMaySeePackages } from '@/lib/packages/packages-gate';

/**
 * A change of one of the signed-in viewer's follows from the dialog: its switches, Unfollow or Undo. `{ follow }`, the
 * follow as it now is (null when it is not theirs). Only for a signed-in viewer who may see package pages.
 */
export async function POST(req: NextRequest) {
  const refusal = await followRefusalOf(req, { change: true, maySee: requestMaySeePackages });
  if (refusal) return refusal;

  const body = changeBodyOf(await followBodyOf(req));
  if (!body) return followFailure('invalid');

  const caller = await followCallerOf(req);
  if (!caller.githubLogin) return followFailure('sign_in');
  return followAnswer(await changeFollow(caller, body), (follow) => ({ follow }));
}
