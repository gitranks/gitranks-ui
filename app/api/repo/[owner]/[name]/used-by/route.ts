import { type NextRequest, NextResponse } from 'next/server';

import { parseUsedByQuery } from './used-by-query';
import { DEPENDENTS_PAGE_SIZE } from '@/components/dependents/dependents.consts';
import { fetchRepoPackages, fetchRepoUsedBy, UNAVAILABLE } from '@/graphql/helpers/fetch-repo-packages';
import { packagesPublic, requestMaySeePackages } from '@/lib/packages/packages-gate';
import { parseRepoParams } from '@/utils/repo-paths';

/** While package pages are not open to everyone, an answer is never kept by a shared cache: it was decided per viewer. */
const PRIVATE = 'private, no-store';
/** Once they are, as the repository's other reads: the browser five minutes, a shared cache an hour. */
const PUBLIC = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';

const answer = (body: unknown, status: number, cacheControl: string) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': cacheControl } });

/**
 * One page of the repositories with 100+ stars that use a repository's packages, for "Show more", the package filter
 * and "Hide archived": `{ page }`. Only for a visitor who may see package pages; anyone else gets the not-found answer.
 */
export async function GET(req: NextRequest, { params }: RouteContext<'/api/repo/[owner]/[name]/used-by'>) {
  const isPublic = await packagesPublic();
  const cacheControl = isPublic ? PUBLIC : PRIVATE;
  if (!isPublic && !(await requestMaySeePackages(req))) {
    return answer({ message: 'Not found' }, 404, PRIVATE);
  }

  const { owner, name } = await params;
  const repo = parseRepoParams(owner, name);
  const query = parseUsedByQuery(req.nextUrl.searchParams);
  if (!repo || !query) {
    return answer({ message: 'Invalid query' }, 400, PRIVATE);
  }

  try {
    const packages = await fetchRepoPackages(repo.owner, repo.name);
    if (packages === null) {
      return answer({ message: 'Not found' }, 404, cacheControl);
    }
    if (packages === UNAVAILABLE) {
      return answer({ message: 'Package data is not available right now' }, 503, PRIVATE);
    }
    // Only a package the repository lists is read: any other name would be one more cached page of nothing.
    if (query.package !== null && !packages.items.some(({ name: listed }) => listed === query.package)) {
      return answer({ page: { total: 0, archived: 0, items: [] } }, 200, cacheControl);
    }

    const page = await fetchRepoUsedBy(repo.owner, repo.name, { ...query, limit: DEPENDENTS_PAGE_SIZE });
    if (page === UNAVAILABLE) {
      return answer({ message: 'Package data is not available right now' }, 503, PRIVATE);
    }
    if (page === null) {
      return answer({ message: 'Not found' }, 404, cacheControl);
    }
    return answer({ page }, 200, cacheControl);
  } catch {
    return answer({ message: 'Failed to load the repositories' }, 502, PRIVATE);
  }
}
