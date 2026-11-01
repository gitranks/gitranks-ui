import type { FC } from 'react';

import { ContributeSection } from './contribute-section';
import type { ExampleRank } from './hero-aside';
import type {
  fetchFeaturedOrg,
  fetchGlobalTiers,
  fetchLandingInsights,
  fetchLeaderboards,
  fetchTopOrgs,
  fetchTopRepos,
} from './landing-data';
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
} from './landing-sections';
import { formatCompact, tierAt } from './landing-ui';
import type { Leaderboard } from './leaderboard-tabs';
import type { ReadmeShowcase } from './readme-showcase';
import { ReposSection } from './repos-section';
import { Header } from '@/components/header/header';
import type { CountryQuery, CountrySummaryQuery, LanguageSummaryQuery } from '@/types/generated/graphql';

const EXAMPLE_COUNT = 3;

/** What the landing shows, as its cached reads return it (see `landing-data.ts`). */
export type LandingData = {
  insights: Awaited<ReturnType<typeof fetchLandingInsights>>;
  leaderboards: Awaited<ReturnType<typeof fetchLeaderboards>>;
  tiers: Awaited<ReturnType<typeof fetchGlobalTiers>>;
  orgs: Awaited<ReturnType<typeof fetchTopOrgs>>;
  featured: Awaited<ReturnType<typeof fetchFeaturedOrg>>;
  countries: CountrySummaryQuery['countrySummary'];
  languages: LanguageSummaryQuery['languageSummary'];
  countryList: NonNullable<CountryQuery['country']>;
  repos: Awaited<ReturnType<typeof fetchTopRepos>>;
  showcase: ReadmeShowcase;
};

/** The landing page from its data: the same for every visitor, apart from the parts read in the browser. */
export const LandingScreen: FC<LandingData> = ({
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
}) => {
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
              notCounted: board.key === 's' ? row.user.starsNotCounted : null,
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
            notCounted: row.user.starsNotCounted,
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
          <ContributeSection />
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
};
