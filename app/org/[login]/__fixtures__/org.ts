import { orgBig } from '@/badge/v3/fixtures';
import { facts as pulseFacts } from '@/components/pulse/pulse.fixtures';
import type { PageOrgQuery } from '@/types/generated/graphql';

type Org = NonNullable<PageOrgQuery['organization']>;

const topRepo = (name: string, stars: number, language: string, s: number, tier: number, level: number) => ({
  githubId: `R_nebula_${name}`,
  owner: 'nebula',
  name,
  nameWithOwner: `nebula/${name}`,
  ownerAvatarUrl: 'https://avatars.githubusercontent.com/u/org1?v=4',
  description: null,
  language,
  stars,
  gainedThisMonth: Math.round(stars / 30),
  rank: { s, tier: { tier, level } },
});

/**
 * `nebula`, the badge fixtures' `orgBig`: #12 of the organizations by stars, with its top repositories and a year of
 * analytics.
 */
export const nebulaOrg: Org = {
  githubId: 'O_1',
  login: orgBig.login,
  name: 'Nebula',
  avatarUrl: 'https://avatars.githubusercontent.com/u/org1?v=4',
  email: 'hello@example.com',
  location: 'San Francisco, CA',
  countryFlag: '🇺🇸',
  twitterUsername: 'nebula',
  websiteUrl: 'example.com',
  isVerified: true,
  githubCreatedAt: '2016-04-02T12:00:00Z',
  githubUpdatedAt: '2026-10-26T12:00:00Z',
  s: orgBig.s,
  reposCount: orgBig.reposCount,
  usersCount: 140,
  updatedAt: '2026-10-27T05:00:00Z',
  hasActivity: true,
  rankOrg: { s: 12, sM: 15 },
  topRepos: [
    topRepo('ui', 54_210, 'TypeScript', 1_204, 7, 2),
    topRepo('cli', 22_000, 'Go', 8_311, 6, 3),
    topRepo('icons', 9_000, 'TypeScript', 21_940, 5, 4),
  ],
  pulse: {
    ...pulseFacts,
    sharedContributorOrgs: [
      {
        login: 'fern-lang',
        sharedContributors: 6,
        share: 0.25,
        organization: {
          login: 'fern-lang',
          name: 'Fern',
          avatarUrl: 'https://avatars.githubusercontent.com/u/org3?v=4',
        },
      },
    ],
  },
};

/**
 * `nebula` when some of its stars don't count: `cli` shows 31,400 on GitHub, 9,400 of them from suspected fake accounts.
 * The totals stay the honest ones; GitHub's counts are struck through beside them.
 */
export const nebulaOrgStarsNotCounted: Org = {
  ...nebulaOrg,
  starsNotCounted: { stars: 9_400, repositories: 1 },
  topRepos: nebulaOrg.topRepos.map((repo) =>
    repo.name === 'cli' ? { ...repo, starsCheck: { notCounted: 9_400, githubStars: 31_400 } } : repo,
  ),
};
