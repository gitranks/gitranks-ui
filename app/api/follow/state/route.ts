import type { NextRequest } from 'next/server';

import { readFollowState } from '@/lib/follow/follow-api';
import { packagesOf } from '@/lib/follow/follow-request';
import {
  followAnswer,
  followBodyOf,
  followCallerOf,
  followFailure,
  followJson,
  followRefusalOf,
} from '@/lib/follow/follow-route';

/**
 * The signed-in viewer's follows of a slot's packages, asked once per page load: `{ follows }`. A visitor who is not
 * signed in has none, and the API is not asked.
 */
export async function POST(req: NextRequest) {
  const refusal = followRefusalOf(req, { change: true });
  if (refusal) return refusal;

  const body = (await followBodyOf(req)) as { packages?: unknown } | undefined;
  const packages = packagesOf(body?.packages);
  if (!packages) return followFailure('invalid');

  const caller = await followCallerOf(req);
  if (!caller.githubLogin) return followJson({ follows: [] });
  return followAnswer(await readFollowState(caller, packages), (follows) => ({ follows }));
}
