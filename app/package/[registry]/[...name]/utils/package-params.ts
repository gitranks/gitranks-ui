import { isNpmPackageName } from '@/lib/packages/npm-package-name';
import { packagePath } from '@/utils/package-paths';

/** The registries a package page is drawn for, by the name in its URL (exact, letter case included). */
const REGISTRIES = new Set(['npm']);

export type PackageParams = {
  registry: 'npm';
  /** The package's name: `x` or `@scope/x`. */
  name: string;
};

const decode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

/** The package that a registry and the name's parts, as they are, name; `null` when they cannot name one. */
function packageOf(registry: string, parts: readonly (string | null)[]): PackageParams | null {
  if (!REGISTRIES.has(registry) || parts.length === 0 || parts.length > 2 || parts.some((part) => part === null)) {
    return null;
  }
  const name = parts.join('/');
  return isNpmPackageName(name) ? { registry: 'npm', name } : null;
}

/**
 * The package a page's params name, or `null` when they cannot name one: a registry other than `npm`, more than two
 * name segments, a scope without `@`, or a name npm's rules refuse. A page gets each segment percent-encoded whatever
 * the URL spelled (`@scope` and `%40scope` both arrive as `%40scope`), so each is decoded once here; the `%40`
 * spelling is sent to the plain one before the page, by the proxy.
 */
export function parsePackageParams(registry: string, segments: readonly string[]): PackageParams | null {
  return packageOf(registry, segments.map(decode));
}

/**
 * The same for a route handler, whose params arrive decoded already: decoding them again would take `%2540scope` as
 * `@scope`.
 */
export function parseDecodedPackageParams(registry: string, segments: readonly string[]): PackageParams | null {
  return packageOf(registry, segments);
}

/** Where the browser reads a package's dependents or its refresh: `/api/packages/npm/<name>/<action>`. */
export const packageApiPath = (name: string, action: 'dependents' | 'refresh') =>
  `/api/${packagePath(name)
    .slice(1)
    .replace(/^package\//, 'packages/')}/${action}`;
