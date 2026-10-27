import type { NextRequest } from 'next/server';

import { loadBadgeOrg, loadBadgeRepo, loadBadgeUser } from '@/badge/v3/load';
import { getBadgeResponse, parseEntityRef } from '@/badge/v3/route';

export async function GET(req: NextRequest, { params }: RouteContext<'/badge/repo/[owner]/[name]/[file]'>) {
  const { owner, name, file } = await params;
  return getBadgeResponse(parseEntityRef('repo', { owner, name }), file, req.nextUrl.searchParams, {
    user: loadBadgeUser,
    org: loadBadgeOrg,
    repo: loadBadgeRepo,
  });
}
