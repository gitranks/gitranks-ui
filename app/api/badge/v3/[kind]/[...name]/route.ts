import type { NextRequest } from 'next/server';

import { getEntityFactsResponse } from '@/badge/v3/facts-route';
import { loadBadgeOrg, loadBadgeRepo, loadBadgeUser } from '@/badge/v3/load';

/** What the badge builder knows about a developer, an organization or a repository: the facts its badges read. */
export async function GET(_req: NextRequest, { params }: RouteContext<'/api/badge/v3/[kind]/[...name]'>) {
  const { kind, name } = await params;
  return getEntityFactsResponse(kind, name, { user: loadBadgeUser, org: loadBadgeOrg, repo: loadBadgeRepo });
}
