'use cache';

import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { PackageRankingFrame } from '../../../components/package-ranking-view';
import { isPackageRankingOrderOf, packageRankingOrdersOf, packageRankingRegistryOf } from '../../../package-rankings';
import { fetchPackageRankingFacts } from '@/graphql/helpers/fetch-package-rankings';
import { REGISTRY_IDS } from '@/lib/packages/registries';

// Params not listed in generateStaticParams render on request as a whole page, which is then
// cached; there is no fallback shell, so the route is allowed to block. The page says the same.
export const instant = false;

export async function generateStaticParams() {
  return REGISTRY_IDS.flatMap((registry) =>
    packageRankingOrdersOf(registry).map((by) => ({ registry, by, page: '1' })),
  );
}

export default async function PackageRankingLayout({
  children,
  params,
}: LayoutProps<'/packages/[registry]/[by]/[page]'>) {
  const { registry, by } = await params;
  const registryInfo = packageRankingRegistryOf(registry);

  if (!registryInfo || !isPackageRankingOrderOf(registryInfo.id, by)) {
    cacheLife('hours');
    notFound();
  }

  // The downloads ranking's header names the last of its 7 days; read for that ranking only.
  const facts = by === 'downloads' ? await fetchPackageRankingFacts(registryInfo.registry) : null;
  // Facts that could not be read may read soon: the header is then kept only briefly, with no date.
  if (facts === undefined) {
    cacheLife('minutes');
  } else {
    cacheLife('hours');
  }

  return (
    <PackageRankingFrame registry={registryInfo.id} order={by} downloadsThrough={facts?.downloadsThrough}>
      {children}
    </PackageRankingFrame>
  );
}
