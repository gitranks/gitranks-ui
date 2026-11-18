import type { NextRequest } from 'next/server';

import { getEntityFactsResponse } from '@/badge/v3/facts-route';
import { loadBadgeOrg, loadBadgePackage, loadBadgeRepo, loadBadgeUser } from '@/badge/v3/load';
import { hiddenPackageFacts, privateAnswer } from '@/badge/v3/package-access';
import { packagesPublic, requestMaySeePackages } from '@/lib/packages/packages-gate';

const LOADERS = { user: loadBadgeUser, org: loadBadgeOrg, repo: loadBadgeRepo };

/**
 * What the badge builder knows about a developer, an organization, a repository or an npm package: the facts its
 * badges read. A package's only for a visitor who may see packages (anyone else gets the not-found answer), and kept by
 * nobody until packages are open to everyone.
 */
export async function GET(req: NextRequest, { params }: RouteContext<'/api/badge/v3/[kind]/[...name]'>) {
  const { kind, name } = await params;
  if (kind !== 'package') {
    return getEntityFactsResponse(kind, name, LOADERS);
  }

  const open = await packagesPublic();
  if (!open && !(await requestMaySeePackages(req))) {
    return hiddenPackageFacts();
  }
  const response = await getEntityFactsResponse(
    kind,
    name,
    { ...LOADERS, package: loadBadgePackage },
    req.nextUrl.pathname,
  );
  return open ? response : privateAnswer(response);
}
