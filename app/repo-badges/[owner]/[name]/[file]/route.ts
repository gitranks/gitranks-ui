import type { NextRequest } from 'next/server';

import { getStarHistoryBadgeResponse } from '@/badge/repo/star-history-badge';

export async function GET(_req: NextRequest, { params }: RouteContext<'/repo-badges/[owner]/[name]/[file]'>) {
  const { owner, name, file } = await params;
  return getStarHistoryBadgeResponse(owner, name, file);
}
