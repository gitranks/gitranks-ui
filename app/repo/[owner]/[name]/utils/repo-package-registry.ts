import type { RepoPackage } from '@/graphql/repo-packages';
import {
  DEFAULT_REGISTRY,
  type PackageRef,
  packageKeyOf,
  type RegistryId,
  registryOfListedApi,
} from '@/lib/packages/registries';

// A repository's packages are read with only the registries the site lists kept (`fetchRepoPackages`), so each one's
// registry is one of the table's.

/** The registry one of a repository's packages is on. */
export const registryOfRepoPackage = (pkg: Pick<RepoPackage, 'registry'>): RegistryId =>
  registryOfListedApi(pkg.registry);

/** One of a repository's packages, by its registry and name. */
export const repoPackageRefOf = (pkg: Pick<RepoPackage, 'registry' | 'name'>): PackageRef => ({
  registry: registryOfRepoPackage(pkg),
  name: pkg.name,
});

/** One of a repository's packages as `<registry>/<name>`: one key per package, whatever registries share a name. */
export const repoPackageKeyOf = (pkg: Pick<RepoPackage, 'registry' | 'name'>) => packageKeyOf(repoPackageRefOf(pkg));

/** The one registry a repository's packages are on (the default one for none listed); `null` across several. */
export function sharedRegistryOf(items: readonly Pick<RepoPackage, 'registry'>[]): RegistryId | null {
  const registries = new Set(items.map(registryOfRepoPackage));
  if (registries.size === 0) return DEFAULT_REGISTRY;
  return registries.size === 1 ? [...registries][0] : null;
}

/** Whether a repository's packages are on more than one registry: their cards and filter then name each one's. */
export const spansRegistries = (items: readonly Pick<RepoPackage, 'registry'>[]) =>
  new Set(items.map(registryOfRepoPackage)).size > 1;
