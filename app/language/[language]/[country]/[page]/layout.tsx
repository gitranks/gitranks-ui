'use cache';

import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';

import { LanguageRankingHeader } from './components/language-ranking-header';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { fetchTopLanguages } from '@/graphql/helpers/top-languages';
import { pageMetadata, pageSuffix } from '@/lib/seo/page-metadata';
import { getLanguageRankingPath } from '@/utils/get-language-ranking-path';
import { parsePageParam } from '@/utils/parse-page-param';
import { GLOBAL_SCOPE, resolveCountryScope, resolveLanguageName } from '@/utils/resolve-route-names';

// Params not listed in generateStaticParams render on request as a whole page, which is then
// cached; there is no fallback shell, so the route is allowed to block. The page says the same.
export const instant = false;

export async function generateMetadata({
  params,
}: LayoutProps<'/language/[language]/[country]/[page]'>): Promise<Metadata> {
  const { language, country, page: pageParam } = await params;

  const page = parsePageParam(pageParam);
  const [languageName, countryName] = await Promise.all([
    resolveLanguageName(decodeURIComponent(language)),
    resolveCountryScope(decodeURIComponent(country)),
  ]);

  if (!page || !countryName) {
    notFound();
  }

  const isGlobal = countryName === GLOBAL_SCOPE;

  return pageMetadata({
    title: `${isGlobal ? 'Global' : countryName} ${languageName} Language Ranking${pageSuffix(page)}`,
    description: `Explore the ${languageName} language ranking${isGlobal ? '' : ` in ${countryName}`}${
      page > 1 ? `, page ${page},` : ''
    } on GitRanks. See how popular ${languageName} is among GitHub developers. Compare rankings globally or within your country.`,
    path: getLanguageRankingPath(languageName, countryName, page),
  });
}

export async function generateStaticParams() {
  const [countries, summaries] = await Promise.all([fetchCountries(), fetchTopLanguages({ limit: 10 })]);
  const page = '1';

  return countries.slice(0, 10).flatMap((country) => {
    return summaries.map((summary) => ({ language: summary.language, country: country.name, page }));
  });
}

export default async function RankingListLayout({
  children,
  params,
}: LayoutProps<'/language/[language]/[country]/[page]'>) {
  cacheLife('hours');
  const { language, country } = await params;
  const [languageName, countryName] = await Promise.all([
    resolveLanguageName(decodeURIComponent(language)),
    resolveCountryScope(decodeURIComponent(country)),
  ]);

  if (!countryName) {
    return notFound();
  }

  const countries = await fetchCountries();

  const countryNames = countries
    .slice(0, 100)
    .map((country) => country.name)
    .toSorted((a, b) => a.localeCompare(b));

  return (
    <>
      <Header section="rankings" />
      <Page className="max-w-5xl gap-6">
        <LanguageRankingHeader country={countryName} language={languageName} countryNames={countryNames} />
        {children}
      </Page>
    </>
  );
}
