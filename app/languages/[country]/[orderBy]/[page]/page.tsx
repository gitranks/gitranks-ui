'use cache';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { LanguageRankingScreen } from './components/language-ranking-screen';
import { buildLanguageRanking, LANGUAGES_PER_PAGE } from './language-ranking';
import { isLanguageSummaryOrder } from './utils/is-language-summary-order';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { fetchCountryLanguageSummaries } from '@/graphql/helpers/fetch-country-language-summary';
import { fetchLanguageSummaries } from '@/graphql/helpers/fetch-language-summary';
import { fetchLanguageSummaryRanks } from '@/graphql/helpers/fetch-summary-ranks';
import { previousSnapshotDate } from '@/lib/rankings/summary-ranking';
import { RANKING_MAX_PAGE } from '@/lib/routing/ranking-routes';
import { parsePageParam } from '@/utils/parse-page-param';
import { GLOBAL_SCOPE, resolveCountryScope } from '@/utils/resolve-route-names';

// Allowed to block for unlisted params, like the layout.
export const instant = false;

export default async function LanguagesPage({ params }: PageProps<'/languages/[country]/[orderBy]/[page]'>) {
  cacheLife('hours');
  const { orderBy, page: pageParam, country } = await params;

  const scope = await resolveCountryScope(decodeURIComponent(country));
  const page = parsePageParam(pageParam);

  const order = orderBy.toUpperCase();
  if (!isLanguageSummaryOrder(order) || !scope || !page || page > RANKING_MAX_PAGE.languageSummary) {
    return notFound();
  }

  const isGlobal = scope === GLOBAL_SCOPE;
  const countryName = isGlobal ? null : scope;
  const offset = (page - 1) * LANGUAGES_PER_PAGE;

  const [all, pageRows, world, countries] = await Promise.all([
    // Totals, shares and moves; the page still shows without them.
    fetchLanguageSummaryRanks({ order, country: countryName }).catch(() => null),
    isGlobal
      ? fetchLanguageSummaries({ order, offset, limit: LANGUAGES_PER_PAGE })
      : fetchCountryLanguageSummaries({ order, offset, limit: LANGUAGES_PER_PAGE, country: scope }),
    // A country's ranking shows each language's place worldwide; the page still shows without it.
    isGlobal ? null : fetchLanguageSummaryRanks({ order, country: null }).catch(() => null),
    fetchCountries(),
  ]);

  const previousDate = previousSnapshotDate(pageRows[0]?.date ?? all?.[0]?.date);
  // Last month's order gives each language's move; the page still shows without it.
  const previous = previousDate
    ? await fetchLanguageSummaryRanks({ order, country: countryName, date: previousDate }).catch(() => null)
    : null;

  const ranking = buildLanguageRanking({
    scope,
    order,
    page,
    all,
    pageRows,
    previous: previous?.length ? previous : null,
    world: world?.length ? world : null,
  });

  if (!ranking) {
    notFound();
  }

  return (
    <LanguageRankingScreen
      scope={scope}
      order={order}
      page={page}
      ranking={ranking}
      countries={countries.map(({ name, flag }) => ({ name, flag })).toSorted((a, b) => a.name.localeCompare(b.name))}
    />
  );
}
