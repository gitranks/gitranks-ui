'use cache';

import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { PackageRankingScreen } from '../../../components/package-ranking-view';
import { isPackageRankingOrder, PACKAGE_RANKINGS, packageRankingRegistryOf } from '../../../package-rankings';
import { buildPackageRankingMetadata } from '../../../seo';
import { ITEMS_PER_PAGE } from '@/app/app.consts';
import { fetchPackageRankingFacts, fetchPackageRankings } from '@/graphql/helpers/fetch-package-rankings';
import { RANKING_MAX_PAGE } from '@/lib/routing/ranking-routes';
import { parsePageParam } from '@/utils/parse-page-param';

// Allowed to block for unlisted params, like the layout.
export const instant = false;

/** The ranking a page's params name, or null when they can never name one. */
async function rankingOf(params: PageProps<'/packages/[registry]/[by]/[page]'>['params']) {
  const { registry, by, page: pageParam } = await params;
  const registryInfo = packageRankingRegistryOf(registry);
  const page = parsePageParam(pageParam);

  if (!registryInfo || !isPackageRankingOrder(by) || !page || page > RANKING_MAX_PAGE.package) {
    return null;
  }

  return { registry, registryInfo, order: by, page, offset: (page - 1) * ITEMS_PER_PAGE };
}

/** A page's rows, and on the first page the ranking's facts. */
const readPage = ({ registryInfo, order, page, offset }: NonNullable<Awaited<ReturnType<typeof rankingOf>>>) =>
  Promise.all([
    fetchPackageRankings({ registry: registryInfo.registry, by: PACKAGE_RANKINGS[order].type, offset }),
    page === 1 ? fetchPackageRankingFacts(registryInfo.registry) : null,
  ]);

export async function generateMetadata({ params }: PageProps<'/packages/[registry]/[by]/[page]'>): Promise<Metadata> {
  const ranking = await rankingOf(params);

  if (!ranking) {
    notFound();
  }

  const [rows, facts] = await readPage(ranking);
  // Kept as long as the page it describes: briefly while it cannot be read or nothing is ranked yet.
  if (rows?.length && facts !== undefined) {
    cacheLife('hours');
  } else {
    cacheLife('minutes');
  }

  const metadata = buildPackageRankingMetadata({
    registry: ranking.registry,
    registryLabel: ranking.registryInfo.label,
    order: ranking.order,
    page: ranking.page,
    rows,
    ranked: facts?.ranked,
  });

  // A page that could not be read now is kept briefly and is not one to index, nor is a ranking with no package yet.
  return rows?.length ? metadata : { ...metadata, robots: { index: false } };
}

export default async function PackageRankingPage({ params }: PageProps<'/packages/[registry]/[by]/[page]'>) {
  const ranking = await rankingOf(params);

  if (!ranking) {
    notFound();
  }

  const [rows, facts] = await readPage(ranking);
  // A ranking or its facts that could not be read, or a ranking with no package yet, may change soon: such a page is
  // kept only briefly.
  if (rows?.length && facts !== undefined) {
    cacheLife('hours');
  } else {
    cacheLife('minutes');
  }

  // Past the last page.
  if (rows && !rows.length && ranking.page > 1) {
    notFound();
  }

  return (
    <PackageRankingScreen
      registry={ranking.registry}
      registryLabel={ranking.registryInfo.label}
      order={ranking.order}
      page={ranking.page}
      rows={rows}
      facts={facts}
    />
  );
}
