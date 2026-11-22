import { DEPENDENTS_MAX_OFFSET, DEPENDENTS_PAGE_SIZE } from '@/components/dependents/dependents.consts';
import { DEFAULT_REGISTRY, isPackageName, isRegistryId, type PackageRef } from '@/lib/packages/registries';

export type UsedByRouteQuery = { offset: number; package: PackageRef | null; hideArchived: boolean };

/**
 * The query of a read of a repository's dependents: `offset` (a multiple of the page size), `package` (one name its
 * registry takes) with `registry` (a listed registry; the default one when left out), and `archived=0` (archived rows
 * left out); `null` for anything else.
 */
export function parseUsedByQuery(search: URLSearchParams): UsedByRouteQuery | null {
  const offsetParam = search.get('offset') ?? '0';
  if (!/^\d{1,4}$/.test(offsetParam)) return null;
  const offset = Number(offsetParam);
  if (offset > DEPENDENTS_MAX_OFFSET || offset % DEPENDENTS_PAGE_SIZE !== 0) return null;

  const name = search.get('package');
  const registry = search.get('registry') ?? DEFAULT_REGISTRY;
  if (!isRegistryId(registry) || (name === null && search.has('registry'))) return null;
  if (name !== null && !isPackageName(registry, name)) return null;

  const archived = search.get('archived');
  if (archived !== null && archived !== '0') return null;

  return { offset, package: name === null ? null : { registry, name }, hideArchived: archived === '0' };
}
