import { after, type NextRequest } from 'next/server';

import { loadBadgeOrg, loadBadgeRepo, loadBadgeUser } from '@/badge/v3/load';
import { getBadgeResponse, parseEntityRef } from '@/badge/v3/route';

/** After the response, never in its way; the reporter is server-only and swallows its own errors. */
function onContributeSeen(repoId: string) {
  after(async () => {
    try {
      const { reportContributeBadgeSeen } = await import('@/badge/v3/contribute-seen');
      await reportContributeBadgeSeen(repoId);
    } catch {
      // Ignored: the next hit reports again.
    }
  });
}

export async function GET(req: NextRequest, { params }: RouteContext<'/badge/repo/[owner]/[name]/[file]'>) {
  const { owner, name, file } = await params;
  return getBadgeResponse(parseEntityRef('repo', { owner, name }), file, req.nextUrl.searchParams, {
    user: loadBadgeUser,
    org: loadBadgeOrg,
    repo: loadBadgeRepo,
    onContributeSeen,
  });
}
