'use cache';
import { unstable_cacheLife as cacheLife } from 'next/cache';

import { CountryCard } from '@/components/country-card/country-card';
import { Pagination } from '@/components/pagination/pagination';
import { fetchCountrySummaries } from '@/graphql/helpers/fetch-country-summaries';
import { CountrySummaryOrder } from '@/types/generated/graphql';

type CountriesPageProps = {
  params: Promise<{ orderBy: CountrySummaryOrder; page: string }>;
};

const ITEMS_PER_PAGE = 24;

export default async function CountriesPage({ params }: CountriesPageProps) {
  cacheLife('hours');
  const { orderBy, page: pageParam } = await params;
  const countrySummaries = await fetchCountrySummaries(orderBy);
  const page = parseInt(pageParam, 10);

  const data = countrySummaries.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(364px,1fr))] gap-4">
        {data.map((item) => (
          <CountryCard key={item.country} countrySummary={item} />
        ))}
      </div>
      <Pagination
        prev={page > 1 ? `/countries/${orderBy}/${page - 1}` : undefined}
        next={`/countries/${orderBy}/${page + 1}`}
      />
    </>
  );
}
