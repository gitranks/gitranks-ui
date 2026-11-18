import type { NextRequest } from 'next/server';

import { badgeSeenReporterFor } from '@/badge/badge-seen-reporter';
import { loadBadgeOrg, loadBadgePackage, loadBadgeRepo, loadBadgeUser } from '@/badge/v3/load';
import { hiddenPackageImage, privateAnswer } from '@/badge/v3/package-access';
import { getBadgeResponse, parsePackageRef } from '@/badge/v3/route';
import { packagesPublic, requestMaySeePackages } from '@/lib/packages/packages-gate';

/**
 * A package's badge: `/badge/package/<registry>/<name>/<badge>.svg|png`, `<name>` in the segments the registry's
 * names take (npm: `x` or `@scope/x`). Only for a
 * visitor who may see packages; anyone else gets the not-found answer. Until packages are open to everyone, every
 * answer is private.
 */
export async function GET(req: NextRequest, { params }: RouteContext<'/badge/package/[registry]/[...rest]'>) {
  const open = await packagesPublic();
  if (!open && !(await requestMaySeePackages(req))) {
    return hiddenPackageImage();
  }

  const { registry, rest } = await params;
  // The name's parts, then the file. Params arrive decoded; the path as asked tells its spelling.
  const ref = rest.length >= 2 ? parsePackageRef(registry, rest.slice(0, -1), req.nextUrl.pathname) : null;
  const response = await getBadgeResponse(ref, rest.at(-1) ?? '', req.nextUrl.searchParams, {
    user: loadBadgeUser,
    org: loadBadgeOrg,
    repo: loadBadgeRepo,
    package: loadBadgePackage,
    onImageServed: badgeSeenReporterFor(req),
  });
  return open ? response : privateAnswer(response);
}
