'use cache';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { CountryRankingScreen } from './components/country-ranking-screen';
import { buildCountryRanking } from './country-ranking';
import { isCountrySummaryOrder } from './utils/is-country-summary-order';
import { fetchCountrySummaries } from '@/graphql/helpers/fetch-country-summaries';
import { fetchCountrySummaryRanks } from '@/graphql/helpers/fetch-summary-ranks';
import { previousSnapshotDate } from '@/lib/rankings/summary-ranking';
import type { CountrySummaryOrder } from '@/types/generated/graphql';
import { parsePageParam } from '@/utils/parse-page-param';

// Allowed to block for unlisted params, like the layout.
export const instant = false;

export default async function CountriesPage({ params }: PageProps<'/countries/[orderBy]/[page]'>) {
  cacheLife('hours');
  const { orderBy, page: pageParam } = await params;

  const page = parsePageParam(pageParam);

  if (!isCountrySummaryOrder(orderBy) || !page) {
    return notFound();
  }

  const order = orderBy.toUpperCase() as CountrySummaryOrder;
  const summaries = await fetchCountrySummaries(order);
  const previousDate = previousSnapshotDate(summaries[0]?.date);
  // Last month's order gives each country's move; the page still shows without it.
  const previous = previousDate ? await fetchCountrySummaryRanks(order, previousDate).catch(() => null) : null;

  const ranking = buildCountryRanking(order, page, summaries, previous?.length ? previous : null);

  if (!ranking || (!ranking.rows.length && page > 1)) {
    notFound();
  }

  return <CountryRankingScreen order={order} page={page} ranking={ranking} />;
}
