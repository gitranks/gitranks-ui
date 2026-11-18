import type { NextRequest } from 'next/server';

import type { FollowChannelsView } from '@/lib/follow/follow.types';
import { readFollowChannels } from '@/lib/follow/follow-api';
import { packagesOf } from '@/lib/follow/follow-request';
import { followAnswer, followCallerOf, followFailure, followRefusalOf } from '@/lib/follow/follow-route';
import { readLinkToken } from '@/lib/link-token/link-cookie';
import { requestMaySeePackages } from '@/lib/packages/packages-gate';
import { DEFAULT_REGISTRY } from '@/lib/packages/registries';

/**
 * The Follow dialog's channels, asked when it opens: `{ channels, dependents, notable, settingsLink }`. With
 * `?package=<name>` (one package, on `?registry=<registry>` or the default registry) the answer also says how many repositories use it now. `settingsLink` says
 * whether Settings will open here: for a signed-in viewer, or a browser holding an email settings link's key (read here
 * from its cookie; the key is never answered). Only
 * for a viewer who may see package pages.
 */
export async function GET(req: NextRequest) {
  const refusal = await followRefusalOf(req, { change: false, maySee: requestMaySeePackages });
  if (refusal) return refusal;

  const name = req.nextUrl.searchParams.get('package');
  const registry = req.nextUrl.searchParams.get('registry') ?? DEFAULT_REGISTRY;
  const packages = name === null ? null : packagesOf([{ registry, name }]);
  if (name !== null && !packages) return followFailure('invalid');

  const caller = await followCallerOf(req);
  const answer = await readFollowChannels(caller, packages?.[0] ?? null);
  // Settings opens on a signed-in viewer's own list, or on an email settings link this browser holds.
  const settingsLink = !!caller.githubLogin || (await readLinkToken('settings')) !== null;
  return followAnswer(answer, (data): FollowChannelsView => ({ ...data, settingsLink }));
}
