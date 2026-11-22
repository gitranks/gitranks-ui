import type { NextRequest } from 'next/server';

import { followBodyOf, followCallerOf, followFailure, followJson, followRefusalOf } from '@/lib/follow/follow-route';
import { followingPressOf, pressSessionSettings } from '@/lib/follow/following-session';

/**
 * A press on `/following` for a signed-in viewer without an email settings link: a follow's switches, Unfollow, Undo,
 * sending to a paused address again, or stopping every follow. Answers the page as it now is. Only for a signed-in
 * viewer; a press from another site is refused. No link key is read or sent.
 */
export async function POST(req: NextRequest) {
  const refusal = followRefusalOf(req, { change: true });
  if (refusal) return refusal;

  const press = followingPressOf(await followBodyOf(req));
  if (!press) return followFailure('invalid');

  const caller = await followCallerOf(req);
  if (!caller.githubLogin) return followFailure('sign_in');
  const state = await pressSessionSettings(caller, press);
  return state ? followJson(state) : followFailure('not_found');
}
