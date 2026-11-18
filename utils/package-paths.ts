import type { Route } from 'next';

/**
 * A package's page: `/package/npm/<name>`, a scoped name as `/package/npm/@scope/name`. The `@` and the `/` stay as
 * they are, so a page has one address; anything else in a part is percent-encoded.
 */
export function packagePath(name: string, registry = 'npm') {
  const parts = name.split('/').map((part) => encodeURIComponent(part).replace(/^%40/, '@'));
  return `/package/${encodeURIComponent(registry)}/${parts.join('/')}` as Route;
}

/** A page of a package ranking: `/packages/npm/downloads/1`. */
export function packageRankingPath(by: string, page: number | string = 1, registry = 'npm') {
  return `/packages/${encodeURIComponent(registry)}/${encodeURIComponent(by)}/${page}` as Route;
}
