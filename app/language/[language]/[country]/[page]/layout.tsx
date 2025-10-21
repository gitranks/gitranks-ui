'use cache';

import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';

import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { fetchTopLanguages } from '@/graphql/helpers/top-languages';

import { LanguageRankingHeader } from './components/language-ranking-header';

export async function generateMetadata({
  params,
}: LayoutProps<'/language/[language]/[country]/[page]'>): Promise<Metadata> {
  const { language, country, page: pageParam } = await params;

  const page = parseInt(pageParam, 10);
  const isGlobal = country === 'global';

  return {
    title: `${isGlobal ? 'Global' : country} ${language} Language Ranking${
      page > 1 ? ` · Page ${page}` : ''
    } · GitRanks`,
    description: `Explore the ${language} language ranking${
      isGlobal ? '' : ` in ${country}`
    } on GitRanks. See how popular ${language} is among GitHub developers. Compare rankings globally or within your country.`,
  };
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
  const countryName = decodeURIComponent(country);
  const languageName = decodeURIComponent(language);

  const countries = await fetchCountries();

  const countryNames = countries
    .slice(0, 100)
    .map((country) => country.name)
    .toSorted((a, b) => a.localeCompare(b));

  return (
    <>
      <Header />
      <Page className="max-w-5xl gap-6">
        <LanguageRankingHeader country={countryName} language={languageName} countryNames={countryNames} />
        {children}
      </Page>
    </>
  );
}
