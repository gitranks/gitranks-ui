import type { Route } from 'next';

import { DEFAULT_REGISTRY, type RegistryId, segmentsOfName } from '@/lib/packages/registries';

/**
 * A package's page: `/package/<registry>/<name>`, the name in the segments the registry's names take (npm: a scoped
 * name as `/package/npm/@scope/name`). A leading `@` stays as it is, so a page has one address; anything else in a
 * segment is percent-encoded.
 */
export function packagePath(name: string, registry: RegistryId = DEFAULT_REGISTRY) {
  const parts = segmentsOfName(registry, name).map((part) => encodeURIComponent(part).replace(/^%40/, '@'));
  return `/package/${encodeURIComponent(registry)}/${parts.join('/')}` as Route;
}

/** Where package numbers are explained. */
export const PACKAGE_METHODOLOGY_PATH = '/methodology/packages' as Route;

/** A page of a package ranking: `/packages/npm/downloads/1`. */
export function packageRankingPath(by: string, page: number | string = 1, registry: RegistryId = DEFAULT_REGISTRY) {
  return `/packages/${encodeURIComponent(registry)}/${encodeURIComponent(by)}/${page}` as Route;
}
