import { type NextRequest, NextResponse } from 'next/server';

import { fetchRepoPulseContributors } from '@/graphql/helpers/fetch-repo-pulse';
import { parseRepoParams } from '@/utils/repo-paths';
import { PULSE_CACHE_CONTROL, parseRepoPulseContributorsParams } from '@/utils/repo-pulse';

const fail = (message: string, status: number) =>
  NextResponse.json({ message }, { status, headers: { 'Cache-Control': 'no-store' } });

/** One page of the repository's top contributors: `{ page }`, `null` when there is no data. */
export async function GET(req: NextRequest, { params }: RouteContext<'/api/repo/[owner]/[name]/pulse/contributors'>) {
  const { owner, name } = await params;
  const repo = parseRepoParams(owner, name);
  if (!repo) {
    return fail('Invalid repository', 400);
  }

  const query = parseRepoPulseContributorsParams(req.nextUrl.searchParams);
  if (!query) {
    return fail('Invalid query', 400);
  }

  try {
    const { period, sortBy, label, first, offset } = query;
    const read = (of: string | null) => fetchRepoPulseContributors(repo.owner, repo.name, period, sortBy, of);

    // Only a label the period lists is read: any other string would be one more cached table.
    const all = label === null ? null : await read(null);
    const table =
      label === null || all?.labels.includes(label)
        ? await read(label)
        : all && { total: 0, unlinkedAuthors: 0, labels: all.labels, items: [] };
    const page = table && { ...table, items: table.items.slice(offset, offset + first) };

    return NextResponse.json({ page }, { headers: { 'Cache-Control': PULSE_CACHE_CONTROL } });
  } catch {
    return fail('Failed to load the contributors', 502);
  }
}
