import { isRegistryId, nameOfSegments, type RegistryId } from '@/lib/packages/registries';
import { packagePath } from '@/utils/package-paths';

export type PackageParams = {
  /** The registry, by its name in URLs (exact, letter case included). */
  registry: RegistryId;
  /** The package's name as the registry writes it: on npm `x` or `@scope/x`. */
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
  if (!isRegistryId(registry) || parts.some((part) => part === null)) {
    return null;
  }
  const name = nameOfSegments(registry, parts as string[]);
  return name === null ? null : { registry, name };
}

/**
 * The package a page's params name, or `null` when they cannot name one: a registry the site does not list, more or
 * fewer name segments than the registry's names take (npm: one or two), or a name the registry's rules refuse (npm: a
 * scope without `@`). A page gets each segment percent-encoded whatever
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

/** Where the browser reads a package's dependents or its refresh: `/api/packages/<registry>/<name>/<action>`. */
export const packageApiPath = (registry: RegistryId, name: string, action: 'dependents' | 'refresh') =>
  `/api/${packagePath(name, registry)
    .slice(1)
    .replace(/^package\//, 'packages/')}/${action}`;
