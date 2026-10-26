import { type NextRequest, NextResponse } from 'next/server';

import { fetchRepoPulseContributors } from '@/graphql/helpers/fetch-repo-pulse';
import { parseRepoParams } from '@/utils/repo-paths';
import { parseRepoPulseContributorsParams } from '@/utils/repo-pulse';

/** One page of the repository's top contributors: `{ page }`, `null` when there is no data. */
export async function GET(req: NextRequest, { params }: RouteContext<'/api/repo/[owner]/[name]/pulse/contributors'>) {
  const { owner, name } = await params;
  const repo = parseRepoParams(owner, name);
  if (!repo) {
    return NextResponse.json({ message: 'Invalid repository' }, { status: 400 });
  }

  const query = parseRepoPulseContributorsParams(req.nextUrl.searchParams);
  if (!query) {
    return NextResponse.json({ message: 'Invalid query' }, { status: 400 });
  }

  try {
    const { period, sortBy, label, first, offset } = query;
    const page = await fetchRepoPulseContributors(repo.owner, repo.name, period, sortBy, label, first, offset);
    return NextResponse.json({ page });
  } catch {
    return NextResponse.json({ message: 'Failed to load the contributors' }, { status: 502 });
  }
}
