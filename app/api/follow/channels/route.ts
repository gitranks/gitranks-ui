import type { NextRequest } from 'next/server';

import type { FollowChannelsView } from '@/lib/follow/follow.types';
import { readFollowChannels } from '@/lib/follow/follow-api';
import { packagesOf } from '@/lib/follow/follow-request';
import { followAnswer, followCallerOf, followFailure, followRefusalOf } from '@/lib/follow/follow-route';
import { readLinkToken } from '@/lib/link-token/link-cookie';
import { requestMaySeePackages } from '@/lib/packages/packages-gate';

/**
 * The Follow dialog's channels, asked when it opens: `{ channels, dependents, notable, settingsLink }`. With
 * `?package=<name>` (one npm package) the answer also says how many repositories use it now. `settingsLink` says
 * whether this browser holds an email settings link's key, read here from its cookie; the key is never answered. Only
 * for a viewer who may see package pages.
 */
export async function GET(req: NextRequest) {
  const refusal = await followRefusalOf(req, { change: false, maySee: requestMaySeePackages });
  if (refusal) return refusal;

  const name = req.nextUrl.searchParams.get('package');
  const packages = name === null ? null : packagesOf([{ registry: 'npm', name }]);
  if (name !== null && !packages) return followFailure('invalid');

  const answer = await readFollowChannels(await followCallerOf(req), packages?.[0] ?? null);
  const settingsLink = (await readLinkToken('settings')) !== null;
  return followAnswer(answer, (data): FollowChannelsView => ({ ...data, settingsLink }));
}
