import type { Metadata } from 'next';

import { ContributeSection } from './components/landing/contribute-section';
import type { ExampleRank } from './components/landing/hero-aside';
import {
  fetchContributeOpen,
  fetchFeaturedOrg,
  fetchGlobalTiers,
  fetchLandingInsights,
  fetchLeaderboards,
  fetchTopOrgs,
  fetchTopRepos,
} from './components/landing/landing-data';
import {
  BadgesSection,
  Container,
  FaqSection,
  Hero,
  InsightsSection,
  InsightTicker,
  LeaderboardSection,
  OrganizationsSection,
  PlacesSection,
  SupportStrip,
  TiersSection,
  UpdatesSection,
} from './components/landing/landing-sections';
import { formatCompact, tierAt } from './components/landing/landing-ui';
import type { Leaderboard } from './components/landing/leaderboard-tabs';
import { fetchReadmeShowcase } from './components/landing/readme-showcase';
import { ReposSection } from './components/landing/repos-section';
import { Header } from '@/components/header/header';
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

const EXAMPLE_COUNT = 3;

// Every read below is a shared, cached function (see landing-data.ts and the helpers' own cache
// lifetimes), so the page is prerendered and a view sends no request to the API. Only the signed-in
// visitor's own rank card is fetched in the browser, from a route cached per user, and their own
// badges, from the public badge data the builder reads.
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
    contributeOpen,
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
    fetchContributeOpen(),
  ]);

  const flags = new Map(countryList.map((country) => [country.name, country.flag]));

  const boards: Leaderboard[] = [
    { key: 's', tab: 'Stars', valueLabel: 'Stars', href: '/by/stars/1', rows: [] },
    { key: 'c', tab: 'Contributions', valueLabel: 'Contribution stars', href: '/by/contributions/1', rows: [] },
    { key: 'f', tab: 'Followers', valueLabel: 'Followers', href: '/by/followers/1', rows: [] },
  ];
  for (const board of boards) {
    board.rows = leaderboards[board.key].flatMap((row) =>
      row.user && row[board.key]
        ? [
            {
              position: row[board.key] as number,
              previous: row[`${board.key}M`] ?? null,
              login: row.user.login,
              avatarUrl: row.user.avatarUrl ?? null,
              flag: (row.user.country && flags.get(row.user.country)) || null,
              country: row.user.country ?? null,
              location: row.user.location ?? null,
              value: row.user[board.key] ?? null,
            },
          ]
        : [],
    );
  }

  const examples: ExampleRank[] = leaderboards.s.slice(0, EXAMPLE_COUNT).flatMap((row) => {
    if (!row.user || !row.s) return [];
    const tier = tierAt(tiers?.sTiers, row.s);
    return [
      {
        login: row.user.login,
        avatarUrl: row.user.avatarUrl ?? null,
        location: row.user.location,
        flag: (row.user.country && flags.get(row.user.country)) || null,
        ranking: 's' as const,
        rankings: {
          s: {
            position: row.s,
            previous: row.sM ?? null,
            value: row.user.s ?? null,
            rankedCount: tiers?.sUsers ?? null,
            tier: tier ? { tier: tier.tier, level: tier.level } : null,
          },
        },
      },
    ];
  });

  const developersRanked = tiers ? Math.max(tiers.sUsers ?? 0, tiers.cUsers ?? 0, tiers.fUsers ?? 0) : null;
  const stats = tiers
    ? [
        { value: formatCompact(tiers.cUsers, true), label: 'ranked by contribution stars' },
        { value: formatCompact(tiers.sUsers, true), label: 'ranked by stars' },
        { value: formatCompact(tiers.fUsers, true), label: 'ranked by followers' },
        { value: '7', label: 'tiers, Rookie to Legend' },
      ]
    : [];

  return (
    <>
      <Header />
      <InsightTicker insight={insights[0]} />
      <main>
        <Hero developersRanked={developersRanked} examples={examples} stats={stats} />
        <Container>
          <ContributeSection open={contributeOpen} />
          <LeaderboardSection boards={boards} />
          <InsightsSection insights={insights} />
          <OrganizationsSection orgs={orgs} flags={flags} featured={featured} />
          <ReposSection rows={repos} />
          <PlacesSection countries={countries} languages={languages} />
          <BadgesSection showcase={showcase} />
          <TiersSection />
          <UpdatesSection />
          <FaqSection />
        </Container>
        <SupportStrip />
      </main>
    </>
  );
}
