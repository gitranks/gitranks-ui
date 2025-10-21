'use cache';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { PageGrid } from '@/components/grid/grid';
import { Pagination } from '@/components/pagination/pagination';
import { fetchCountryLanguageSummaries } from '@/graphql/helpers/fetch-country-language-summary';
import { fetchLanguageSummaries } from '@/graphql/helpers/fetch-language-summary';

import { LanguageCard } from './components/language-card';
import { isLanguageSummaryOrder } from './utils/is-language-summary-order';

const ITEMS_PER_PAGE = 24;

export default async function LanguagesPage({ params }: PageProps<'/languages/[country]/[orderBy]/[page]'>) {
  cacheLife('hours');
  const { orderBy, page: pageParam, country } = await params;

  const countryName = decodeURIComponent(country);

  const orderByUpper = orderBy.toUpperCase();
  if (!isLanguageSummaryOrder(orderByUpper)) {
    return notFound();
  }

  const method = countryName === 'global' ? fetchLanguageSummaries : fetchCountryLanguageSummaries;

  const page = parseInt(pageParam, 10);
  const offset = (page - 1) * ITEMS_PER_PAGE;
  const data = await method({ order: orderByUpper, offset, limit: ITEMS_PER_PAGE, country: countryName });

  return (
    <>
      <PageGrid>
        {data.map((item) => (
          <LanguageCard key={item.language} data={item} country={country} />
        ))}
      </PageGrid>
      <Pagination
        prev={page > 1 ? `/languages/${country}/${orderBy}/${page - 1}` : undefined}
        next={`/languages/${country}/${orderBy}/${page + 1}`}
      />
    </>
  );
}
