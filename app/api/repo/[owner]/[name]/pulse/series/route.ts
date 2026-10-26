import { type NextRequest, NextResponse } from 'next/server';

import { fetchRepoPulseSeries } from '@/graphql/helpers/fetch-repo-pulse';
import { parseRepoParams } from '@/utils/repo-paths';
import { PULSE_CACHE_CONTROL, parseRepoPulseSeriesParams } from '@/utils/repo-pulse';

const fail = (message: string, status: number) =>
  NextResponse.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });

/** The repository's 60-month series for one grouping: `{ series }`, `null` when there is no data. */
export async function GET(req: NextRequest, { params }: RouteContext<'/api/repo/[owner]/[name]/pulse/series'>) {
  const { owner, name } = await params;
  const repo = parseRepoParams(owner, name);
  if (!repo) {
    return fail('Invalid repository', 400);
  }

  const groupBy = parseRepoPulseSeriesParams(req.nextUrl.searchParams);
  if (!groupBy) {
    return fail('Invalid grouping', 400);
  }

  try {
    const series = await fetchRepoPulseSeries(repo.owner, repo.name, groupBy);
    return NextResponse.json({ series }, { headers: { 'Cache-Control': PULSE_CACHE_CONTROL } });
  } catch {
    return fail('Failed to load the series', 502);
  }
}
