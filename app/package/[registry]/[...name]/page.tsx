'use cache';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound, permanentRedirect } from 'next/navigation';

import { PackageScreen } from './components/package-screen';
import { buildPackageSEO } from './seo';
import { parsePackageParams } from './utils/package-params';
import { fetchPackage, isPackageSettling, PACKAGE_UNAVAILABLE } from '@/graphql/helpers/fetch-package';
import { packageCacheTag } from '@/lib/packages/package-paths';
import { packagePath } from '@/utils/package-paths';

// Renders as one piece, like a repository's page; cached data keeps the render cheap. One package is listed in
// generateStaticParams, so any other renders on request as a whole page before the response starts: there is no
// fallback shell, `notFound()` answers 404 and `permanentRedirect()` a real 308. The page is then kept in memory only
// (`lib/cache/page-cache-handler.cjs`), never on disk. Who may see it is decided before it renders, never here.
export const instant = false;

export async function generateStaticParams() {
  return [{ registry: 'npm', name: ['react'] }];
}

/** The package the params name; not found for a name that can name none. */
async function packageParamsOf(params: PageProps<'/package/[registry]/[...name]'>['params']) {
  const { registry, name } = await params;
  const parsed = parsePackageParams(registry, name);
  if (!parsed) {
    notFound();
  }
  return parsed;
}

export async function generateMetadata({ params }: PageProps<'/package/[registry]/[...name]'>): Promise<Metadata> {
  const { name, canonical } = await packageParamsOf(params);
  const pkg = await fetchPackage(name);
  if (!pkg || !canonical || (pkg !== PACKAGE_UNAVAILABLE && pkg.name !== name)) {
    return {};
  }
  return buildPackageSEO(pkg, name, pkg === PACKAGE_UNAVAILABLE ? [] : (pkg.dependents?.items ?? [])).metadata;
}

export default async function PackagePageRoute({ params }: PageProps<'/package/[registry]/[...name]'>) {
  const { name, canonical } = await packageParamsOf(params);
  // One URL per package: `%40` for the `@` redirects to the plain spelling.
  if (!canonical) {
    permanentRedirect(packagePath(name));
  }

  cacheTag(packageCacheTag(name));
  const pkg = await fetchPackage(name);
  // No package data now, a refresh under way, or a name nobody has read yet: the page changes soon, so it is kept
  // for minutes. A 200 even then: a crawler would read a 404 as the page's end.
  if (pkg === PACKAGE_UNAVAILABLE || (pkg && isPackageSettling(pkg))) {
    cacheLife('minutes');
  } else {
    cacheLife('hours');
  }

  if (!pkg) {
    notFound();
  }
  if (pkg === PACKAGE_UNAVAILABLE) {
    return <PackageScreen name={name} pkg={pkg} />;
  }
  // The registry's own spelling, when the API names it otherwise.
  if (pkg.name !== name) {
    permanentRedirect(packagePath(pkg.name));
  }

  const rows = pkg.dependents?.items ?? [];
  return <PackageScreen name={name} pkg={pkg} jsonLd={buildPackageSEO(pkg, name, rows).jsonLd} />;
}
