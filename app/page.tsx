import type { Metadata } from 'next';

import {
  fetchContributeForVisitors,
  fetchFeaturedOrg,
  fetchGlobalTiers,
  fetchHomeLearnCourses,
  fetchLandingInsights,
  fetchLandingPackages,
  fetchLeaderboards,
  fetchTopOrgs,
  fetchTopRepos,
} from './components/landing/landing-data';
import { LandingScreen } from './components/landing/landing-screen';
import { fetchReadmeShowcase } from './components/landing/readme-showcase';
import { fetchCountries } from '@/graphql/helpers/fetch-countries';
import { fetchCountrySummaries } from '@/graphql/helpers/fetch-country-summaries';
import { fetchLanguageSummaries } from '@/graphql/helpers/fetch-language-summary';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { SITE_DESCRIPTION, SITE_TITLE } from '@/lib/seo/site';
import { fetchUnsungHero } from '@/lib/unsung-hero/unsung-hero-read';
import { LanguageSummaryOrder } from '@/types/generated/graphql';

export const metadata: Metadata = pageMetadata({
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  path: '/',
});

// Every read below is a shared, cached function (see landing-data.ts and the helpers' own cache
// lifetimes), so the page is prerendered and a view sends no request to the API. Only the signed-in
// visitor's own parts are fetched in the browser: their rank card, from a route cached per user; their
// badges, from the public badge data the builder reads; and their cards in the block for Contribute
// and Learn, from a route never kept.
export default async function Home() {
  const [
    insights,
    leaderboards,
    tiers,
    orgs,
    featured,
    countries,
    languages,
    countryList,
    repos,
    showcase,
    contribute,
    hero,
    packages,
    learnCourses,
  ] = await Promise.all([
    fetchLandingInsights(),
    fetchLeaderboards(),
    fetchGlobalTiers(),
    fetchTopOrgs(),
    fetchFeaturedOrg(),
    fetchCountrySummaries(),
    fetchLanguageSummaries({ order: LanguageSummaryOrder.Score, offset: 0, limit: 8 }),
    fetchCountries(),
    fetchTopRepos(),
    fetchReadmeShowcase(),
    fetchContributeForVisitors(),
    // This week's Unsung hero, in the page's HTML; a failed read leaves the column's other cards.
    fetchUnsungHero().catch(() => null),
    // The top of the package rankings; a ranking that cannot be read is left out, with none the block is.
    fetchLandingPackages().catch(() => null),
    // Learn's live courses, which the Learn card names; a failed read is none, and the card keeps its plain line.
    fetchHomeLearnCourses(),
  ]);

  return (
    <LandingScreen
      insights={insights}
      leaderboards={leaderboards}
      tiers={tiers}
      orgs={orgs}
      featured={featured}
      countries={countries}
      languages={languages}
      countryList={countryList}
      repos={repos}
      showcase={showcase}
      hero={hero}
      packages={packages}
      learnCourses={learnCourses}
      contribute={contribute}
    />
  );
}
