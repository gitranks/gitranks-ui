'use cache';

import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { PackageRankingFrame } from '../../../components/package-ranking-view';
import { isPackageRankingOrder, PACKAGE_RANKING_ORDER_LIST, packageRankingRegistryOf } from '../../../package-rankings';

// Params not listed in generateStaticParams render on request as a whole page, which is then
// cached; there is no fallback shell, so the route is allowed to block. The page says the same.
export const instant = false;

export async function generateStaticParams() {
  return PACKAGE_RANKING_ORDER_LIST.map((by) => ({ registry: 'npm', by, page: '1' }));
}

export default async function PackageRankingLayout({
  children,
  params,
}: LayoutProps<'/packages/[registry]/[by]/[page]'>) {
  cacheLife('hours');
  const { registry, by } = await params;
  const registryInfo = packageRankingRegistryOf(registry);

  if (!registryInfo || !isPackageRankingOrder(by)) {
    notFound();
  }

  return (
    <PackageRankingFrame registry={registry} registryLabel={registryInfo.label} order={by}>
      {children}
    </PackageRankingFrame>
  );
}
