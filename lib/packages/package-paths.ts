import type { Route } from 'next';

import { REPO_TABS } from '@/lib/routing/ranking-routes';

const SEP = '[/\\\\]+';
const SEGMENT = '[^/\\\\]+';

/**
 * Every page behind the packages gate, as one list of path starts: a package's page, the package rankings, how
 * packages are counted, and a repository's tabs.
 */
const PACKAGE_PAGES: readonly string[] = [
  `${SEP}package`,
  `${SEP}packages`,
  `${SEP}methodology${SEP}packages`,
  `${SEP}repo${SEP}${SEGMENT}${SEP}${SEGMENT}${SEP}(?:${REPO_TABS.join('|')})`,
];

/** A page or anything under it, in any letter case. */
const PAGE = new RegExp(`^(?:${PACKAGE_PAGES.join('|')})(?:[/\\\\]|$)`, 'i');
/** The start alone: for a path that does not decode, kept out rather than let through. */
const PAGE_START = new RegExp(`^(?:${PACKAGE_PAGES.join('|')})`, 'i');

/**
 * Whether the path is a page behind the packages gate, in any spelling the router reads as it (percent-encoded,
 * doubled slashes, upper case), so an encoded spelling cannot get past the gate.
 */
export function isPackagePath(pathname: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return PAGE_START.test(pathname);
  }
  return PAGE.test(decoded);
}

/**
 * One cache tag per npm package, lower case whatever the spelling: `package:npm/<name>`. Whatever sets or expires a
 * package's cache tag writes it with this.
 */
export function packageCacheTag(name: string) {
  return `package:npm/${name}`.toLowerCase();
}

/**
 * An npm package's page: `/package/npm/react`, `/package/npm/@types/node`. Each part of the name is URL-safe already
 * (see `isNpmPackageName`); the scope's `@` is written as it is.
 */
export function packagePath(name: string): Route {
  const parts = name.split('/').map((part) => encodeURIComponent(part).replace(/^%40/, '@'));
  return `/package/npm/${parts.join('/')}` as Route;
}
