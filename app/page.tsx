import type { Metadata } from 'next';

import {
  fetchFeaturedOrg,
  fetchGlobalTiers,
  fetchLandingInsights,
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
import { LanguageSummaryOrder } from '@/types/generated/graphql';

export const metadata: Metadata = pageMetadata({
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  path: '/',
});

// Every read below is a shared, cached function (see landing-data.ts and the helpers' own cache
// lifetimes), so the page is prerendered and a view sends no request to the API. Only the signed-in
// visitor's own rank card is fetched in the browser, from a route cached per user, their own
// badges, from the public badge data the builder reads, and, where Contribute is open to them,
// their own top picks.
export default async function Home() {
  const [insights, leaderboards, tiers, orgs, featured, countries, languages, countryList, repos, showcase] =
    await Promise.all([
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
    />
  );
}
