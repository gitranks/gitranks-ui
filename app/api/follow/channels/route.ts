import type { NextRequest } from 'next/server';

import { readFollowChannels } from '@/lib/follow/follow-api';
import { packagesOf } from '@/lib/follow/follow-request';
import { followAnswer, followCallerOf, followFailure, followRefusalOf } from '@/lib/follow/follow-route';
import { requestMaySeePackages } from '@/lib/packages/packages-gate';

/**
 * The Follow dialog's channels, asked when it opens: `{ channels, dependents, notable }`. With `?package=<name>` (one
 * npm package) the answer also says how many repositories use it now. Only for a viewer who may see package pages.
 */
export async function GET(req: NextRequest) {
  const refusal = await followRefusalOf(req, { change: false, maySee: requestMaySeePackages });
  if (refusal) return refusal;

  const name = req.nextUrl.searchParams.get('package');
  const packages = name === null ? null : packagesOf([{ registry: 'npm', name }]);
  if (name !== null && !packages) return followFailure('invalid');

  const answer = await readFollowChannels(await followCallerOf(req), packages?.[0] ?? null);
  return followAnswer(answer, (data) => data);
}
