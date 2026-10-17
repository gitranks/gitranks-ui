'use cache';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { LanguageCard } from './components/language-card';
import { isLanguageSummaryOrder } from './utils/is-language-summary-order';
import { PageGrid } from '@/components/grid/grid';
import { Pagination } from '@/components/pagination/pagination';
import { fetchCountryLanguageSummaries } from '@/graphql/helpers/fetch-country-language-summary';
import { fetchLanguageSummaries } from '@/graphql/helpers/fetch-language-summary';
import { parsePageParam } from '@/utils/parse-page-param';
import { GLOBAL_SCOPE, resolveCountryScope } from '@/utils/resolve-route-names';

const ITEMS_PER_PAGE = 24;

export default async function LanguagesPage({ params }: PageProps<'/languages/[country]/[orderBy]/[page]'>) {
  cacheLife('hours');
  const { orderBy, page: pageParam, country } = await params;

  const countryName = await resolveCountryScope(decodeURIComponent(country));
  const page = parsePageParam(pageParam);

  const orderByUpper = orderBy.toUpperCase();
  if (!isLanguageSummaryOrder(orderByUpper) || !countryName || !page) {
    return notFound();
  }

  const method = countryName === GLOBAL_SCOPE ? fetchLanguageSummaries : fetchCountryLanguageSummaries;

  const offset = (page - 1) * ITEMS_PER_PAGE;
  const data = await method({ order: orderByUpper, offset, limit: ITEMS_PER_PAGE, country: countryName });

  const basePath = `/languages/${encodeURIComponent(countryName)}/${orderByUpper.toLowerCase()}`;

  return (
    <>
      <PageGrid>
        {data.map((item) => (
          <LanguageCard key={item.language} data={item} country={countryName} />
        ))}
      </PageGrid>
      <Pagination prev={page > 1 ? `${basePath}/${page - 1}` : undefined} next={`${basePath}/${page + 1}`} />
    </>
  );
}
