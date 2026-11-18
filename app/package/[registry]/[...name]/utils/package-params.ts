import { isNpmPackageName } from '@/lib/packages/npm-package-name';
import { packagePath } from '@/utils/package-paths';

/** The registries a package page is drawn for, by the name in its URL (exact, letter case included). */
const REGISTRIES = new Set(['npm']);

export type PackageParams = {
  registry: 'npm';
  /** The package's name: `x` or `@scope/x`. */
  name: string;
  /** Whether the URL spells the `@` as it is; a `%40` for it redirects to the page's own spelling. */
  canonical: boolean;
};

const decode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

/**
 * The package a page's params name, or `null` when they cannot name one: a registry other than `npm`, more than two
 * name segments, a scope without `@`, or a name npm's rules refuse.
 */
export function parsePackageParams(registry: string, segments: readonly string[]): PackageParams | null {
  if (!REGISTRIES.has(registry) || segments.length === 0 || segments.length > 2) {
    return null;
  }
  const parts = segments.map(decode);
  if (parts.some((part) => part === null)) {
    return null;
  }
  const name = parts.join('/');
  if (!isNpmPackageName(name)) {
    return null;
  }

  return { registry: 'npm', name, canonical: !/^%40/i.test(segments[0]) };
}

/** Where the browser reads a package's dependents or its refresh: `/api/packages/npm/<name>/<action>`. */
export const packageApiPath = (name: string, action: 'dependents' | 'refresh') =>
  `/api/${packagePath(name)
    .slice(1)
    .replace(/^package\//, 'packages/')}/${action}`;
