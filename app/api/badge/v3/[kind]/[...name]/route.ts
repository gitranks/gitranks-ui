import type { NextRequest } from 'next/server';

import { getEntityFactsResponse } from '@/badge/v3/facts-route';
import { loadBadgeOrg, loadBadgePackage, loadBadgeRepo, loadBadgeUser } from '@/badge/v3/load';

const LOADERS = { user: loadBadgeUser, org: loadBadgeOrg, repo: loadBadgeRepo };

/**
 * What the badge builder knows about a developer, an organization, a repository or a package: the facts its
 * badges read.
 */
export async function GET(req: NextRequest, { params }: RouteContext<'/api/badge/v3/[kind]/[...name]'>) {
  const { kind, name } = await params;
  if (kind !== 'package') {
    return getEntityFactsResponse(kind, name, LOADERS);
  }

  return getEntityFactsResponse(kind, name, { ...LOADERS, package: loadBadgePackage }, req.nextUrl.pathname);
}
