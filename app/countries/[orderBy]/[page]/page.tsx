'use cache';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { isCountrySummaryOrder } from './utils/is-country-summary-order';
import { CountryCard } from '@/components/country-card/country-card';
import { PageGrid } from '@/components/grid/grid';
import { Pagination } from '@/components/pagination/pagination';
import { fetchCountrySummaries } from '@/graphql/helpers/fetch-country-summaries';
import { parsePageParam } from '@/utils/parse-page-param';

const ITEMS_PER_PAGE = 24;

export default async function CountriesPage({ params }: PageProps<'/countries/[orderBy]/[page]'>) {
  cacheLife('hours');
  const { orderBy, page: pageParam } = await params;

  const page = parsePageParam(pageParam);

  if (!isCountrySummaryOrder(orderBy) || !page) {
    return notFound();
  }

  const countrySummaries = await fetchCountrySummaries(orderBy);

  const data = countrySummaries.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  if (!data.length && page > 1) {
    notFound();
  }

  const basePath = `/countries/${orderBy.toLowerCase()}`;

  return (
    <>
      <PageGrid>
        {data.map((item) => (
          <CountryCard key={item.country} countrySummary={item} />
        ))}
      </PageGrid>
      <Pagination
        prev={page > 1 ? `${basePath}/${page - 1}` : undefined}
        next={countrySummaries.length > page * ITEMS_PER_PAGE ? `${basePath}/${page + 1}` : undefined}
      />
    </>
  );
}
