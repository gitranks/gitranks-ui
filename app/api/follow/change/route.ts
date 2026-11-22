import type { NextRequest } from 'next/server';

import { changeFollow } from '@/lib/follow/follow-api';
import { changeBodyOf } from '@/lib/follow/follow-request';
import { followAnswer, followBodyOf, followCallerOf, followFailure, followRefusalOf } from '@/lib/follow/follow-route';

/**
 * A change of one of the signed-in viewer's follows from the dialog: its switches, Unfollow or Undo. `{ follow }`, the
 * follow as it now is (null when it is not theirs). Only for a signed-in viewer.
 */
export async function POST(req: NextRequest) {
  const refusal = followRefusalOf(req, { change: true });
  if (refusal) return refusal;

  const body = changeBodyOf(await followBodyOf(req));
  if (!body) return followFailure('invalid');

  const caller = await followCallerOf(req);
  if (!caller.githubLogin) return followFailure('sign_in');
  return followAnswer(await changeFollow(caller, body), (follow) => ({ follow }));
}
