'use cache';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { LanguageCard } from './components/language-card';
import { isLanguageSummaryOrder } from './utils/is-language-summary-order';
import { PageGrid } from '@/components/grid/grid';
import { Pagination } from '@/components/pagination/pagination';
import { fetchCountryLanguageSummaries } from '@/graphql/helpers/fetch-country-language-summary';
import { fetchLanguageSummaries } from '@/graphql/helpers/fetch-language-summary';
import { RANKING_MAX_PAGE } from '@/lib/routing/ranking-routes';
import { parsePageParam } from '@/utils/parse-page-param';
import { GLOBAL_SCOPE, resolveCountryScope } from '@/utils/resolve-route-names';

// Allowed to block for unlisted params, like the layout.
export const instant = false;

const ITEMS_PER_PAGE = 24;

export default async function LanguagesPage({ params }: PageProps<'/languages/[country]/[orderBy]/[page]'>) {
  cacheLife('hours');
  const { orderBy, page: pageParam, country } = await params;

  const countryName = await resolveCountryScope(decodeURIComponent(country));
  const page = parsePageParam(pageParam);

  const orderByUpper = orderBy.toUpperCase();
  if (!isLanguageSummaryOrder(orderByUpper) || !countryName || !page || page > RANKING_MAX_PAGE.languageSummary) {
    return notFound();
  }

  const method = countryName === GLOBAL_SCOPE ? fetchLanguageSummaries : fetchCountryLanguageSummaries;

  const offset = (page - 1) * ITEMS_PER_PAGE;
  // One extra row tells whether a next page exists.
  const rows = await method({ order: orderByUpper, offset, limit: ITEMS_PER_PAGE + 1, country: countryName });
  const data = rows.slice(0, ITEMS_PER_PAGE);

  if (!data.length && page > 1) {
    notFound();
  }

  const basePath = `/languages/${encodeURIComponent(countryName)}/${orderByUpper.toLowerCase()}`;

  return (
    <>
      <PageGrid>
        {data.map((item) => (
          <LanguageCard key={item.language} data={item} country={countryName} />
        ))}
      </PageGrid>
      <Pagination
        prev={page > 1 ? `${basePath}/${page - 1}` : undefined}
        next={
          rows.length > ITEMS_PER_PAGE && page < RANKING_MAX_PAGE.languageSummary
            ? `${basePath}/${page + 1}`
            : undefined
        }
      />
    </>
  );
}
