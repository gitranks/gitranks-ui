'use cache';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { CountryCard } from '@/components/country-card/country-card';
import { PageGrid } from '@/components/grid/grid';
import { Pagination } from '@/components/pagination/pagination';
import { fetchCountrySummaries } from '@/graphql/helpers/fetch-country-summaries';

import { isCountrySummaryOrder } from './utils/is-country-summary-order';

const ITEMS_PER_PAGE = 24;

export default async function CountriesPage({ params }: PageProps<'/countries/[orderBy]/[page]'>) {
  cacheLife('hours');
  const { orderBy, page: pageParam } = await params;

  if (!isCountrySummaryOrder(orderBy)) {
    return notFound();
  }

  const countrySummaries = await fetchCountrySummaries(orderBy);
  const page = parseInt(pageParam, 10);

  const data = countrySummaries.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <>
      <PageGrid>
        {data.map((item) => (
          <CountryCard key={item.country} countrySummary={item} />
        ))}
      </PageGrid>
      <Pagination
        prev={page > 1 ? `/countries/${orderBy}/${page - 1}` : undefined}
        next={`/countries/${orderBy}/${page + 1}`}
      />
    </>
  );
}
