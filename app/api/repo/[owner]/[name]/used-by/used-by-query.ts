import { DEPENDENTS_PAGE_SIZE } from '@/components/dependents/dependents.consts';
import { isNpmPackageName } from '@/lib/packages/npm-package-name';

/** The furthest a list is read: 400 presses of "Show more". */
const MAX_OFFSET = 10_000;

export type UsedByRouteQuery = { offset: number; package: string | null; hideArchived: boolean };

/**
 * The query of a read of a repository's dependents: `offset` (a multiple of the page size), `package` (one npm name)
 * and `archived=0` (archived rows left out); `null` for anything else.
 */
export function parseUsedByQuery(search: URLSearchParams): UsedByRouteQuery | null {
  const offsetParam = search.get('offset') ?? '0';
  if (!/^\d{1,5}$/.test(offsetParam)) return null;
  const offset = Number(offsetParam);
  if (offset > MAX_OFFSET || offset % DEPENDENTS_PAGE_SIZE !== 0) return null;

  const pkg = search.get('package');
  if (pkg !== null && !isNpmPackageName(pkg)) return null;

  const archived = search.get('archived');
  if (archived !== null && archived !== '0') return null;

  return { offset, package: pkg, hideArchived: archived === '0' };
}
