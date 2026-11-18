import type { RepoPackage } from '@/graphql/repo-packages';
import { DEFAULT_REGISTRY, type PackageRef, type RegistryId, registryOfApi } from '@/lib/packages/registries';

/** The registry one of a repository's packages is on; the default one for a registry the site does not list. */
export const registryOfRepoPackage = (pkg: Pick<RepoPackage, 'registry'>): RegistryId =>
  registryOfApi(pkg.registry) ?? DEFAULT_REGISTRY;

/** One of a repository's packages, by its registry and name. */
export const repoPackageRefOf = (pkg: Pick<RepoPackage, 'registry' | 'name'>): PackageRef => ({
  registry: registryOfRepoPackage(pkg),
  name: pkg.name,
});

/** The one registry a repository's packages are on (the default one for none listed); `null` across several. */
export function sharedRegistryOf(items: readonly Pick<RepoPackage, 'registry'>[]): RegistryId | null {
  const registries = new Set(items.map(registryOfRepoPackage));
  if (registries.size === 0) return DEFAULT_REGISTRY;
  return registries.size === 1 ? [...registries][0] : null;
}

/** Whether a repository's packages are on more than one registry: their cards and filter then name each one's. */
export const spansRegistries = (items: readonly Pick<RepoPackage, 'registry'>[]) =>
  new Set(items.map(registryOfRepoPackage)).size > 1;
