import { type NextRequest, NextResponse } from 'next/server';

import { fetchRepoPulseSeries } from '@/graphql/helpers/fetch-repo-pulse';
import { parseRepoParams } from '@/utils/repo-paths';
import { parseRepoPulseSeriesParams } from '@/utils/repo-pulse';

/** The repository's 60-month series for one grouping: `{ series }`, `null` when there is no data. */
export async function GET(req: NextRequest, { params }: RouteContext<'/api/repo/[owner]/[name]/pulse/series'>) {
  const { owner, name } = await params;
  const repo = parseRepoParams(owner, name);
  if (!repo) {
    return NextResponse.json({ message: 'Invalid repository' }, { status: 400 });
  }

  const groupBy = parseRepoPulseSeriesParams(req.nextUrl.searchParams);
  if (!groupBy) {
    return NextResponse.json({ message: 'Invalid grouping' }, { status: 400 });
  }

  try {
    const series = await fetchRepoPulseSeries(repo.owner, repo.name, groupBy);
    return NextResponse.json({ series });
  } catch {
    return NextResponse.json({ message: 'Failed to load the series' }, { status: 502 });
  }
}
