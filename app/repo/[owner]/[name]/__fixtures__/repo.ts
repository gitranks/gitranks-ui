import type { RepoFacts } from '@/badge/v3/facts';
import { repoBig, repoSmall } from '@/badge/v3/fixtures';
import { facts as pulseFacts } from '@/components/pulse/pulse.fixtures';
import type { PageRepoQuery, RepoLanguagesQuery, RepoRankTiersQuery } from '@/types/generated/graphql';

type Repo = NonNullable<PageRepoQuery['repo']>;

/** A repository as a row of another repository's lists: its name, no avatar, 1,000 stars. */
export const repoRow = (nameWithOwner: string) => ({
  githubId: nameWithOwner,
  owner: nameWithOwner.split('/')[0],
  name: nameWithOwner.split('/')[1],
  nameWithOwner,
  ownerAvatarUrl: null,
  description: null,
  language: null,
  stars: 1_000,
  gainedThisMonth: null,
});

/** The repositories its builders also commit to, most shared first. */
export const siblings: NonNullable<Repo['siblings']> = [
  { shared: 13, share: 0.33, repo: repoRow('vercel/next.js') },
  { shared: 8, share: 0.21, repo: repoRow('react/react-native') },
  { shared: 6, share: 0.15, repo: repoRow('reactjs/react.dev') },
];

/** Its builders: 12 accounts, two of them Legends. */
export const builtBy: NonNullable<Repo['builtBy']> = {
  accounts: 12,
  counts: [
    { tier: 7, count: 2 },
    { tier: 4, count: 10 },
  ],
  top: [{ login: 'ana', avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4', tier: 7, level: 5 }],
};

/** A stargazer of a tier and level; `null` login for one whose name is not shown. */
export const stargazer = (login: string | null, tier: number, level: number) => ({
  login,
  avatarUrl: login ? `https://avatars.githubusercontent.com/${login}?v=4` : null,
  tier,
  level,
});

/** Starred by 1,284 top developers: the full section. */
export const starsBestFull: NonNullable<Repo['starsBest']> = {
  total: 1_284,
  counts: [
    { tier: 7, count: 214 },
    { tier: 6, count: 1_070 },
  ],
  top: [
    stargazer('ana', 7, 5),
    stargazer('bo', 7, 5),
    stargazer(null, 7, 4),
    stargazer('cy', 7, 4),
    stargazer('di', 7, 3),
    stargazer('ed', 6, 5),
    stargazer('fay', 6, 5),
    stargazer('gus', 6, 4),
  ],
  legendRatio: 4.23,
};

/** Starred by three: the one-line section. */
export const starsBestCompact: NonNullable<Repo['starsBest']> = {
  total: 3,
  counts: [
    { tier: 7, count: 1 },
    { tier: 6, count: 2 },
  ],
  top: [stargazer('ana', 7, 2), stargazer('bo', 6, 5), stargazer('cy', 6, 1)],
  legendRatio: null,
};

/**
 * `nebula/ui`, the badge fixtures' `repoBig`: a Supernova in TypeScript with its star history, siblings, builders,
 * top stargazers and a year of analytics.
 */
export const bigRepo: Repo = {
  githubId: 'R_nebula_ui',
  owner: 'nebula',
  name: 'ui',
  nameWithOwner: repoBig.nameWithOwner,
  ownerAvatarUrl: 'https://avatars.githubusercontent.com/u/org1?v=4',
  description: 'Accessible React components with a design-token theme engine.',
  language: 'TypeScript',
  stars: repoBig.stars,
  gainedThisMonth: repoBig.gainedThisMonth,
  isArchived: false,
  isInOrganization: true,
  createdAt: '2021-03-14T09:12:00Z',
  renamedTo: null,
  burstMonths: ['2025-07'],
  rank: {
    language: 'TypeScript',
    s: 1_204,
    sM: 1_250,
    l: 112,
    lM: 118,
    tier: { tier: 7, level: 2, minRank: 1_001, maxRank: 2_100, minValue: 41_000 },
    languageTier: { tier: 7, level: 4 },
  },
  history: repoBig.history && { ...repoBig.history, readAt: '2026-10-27T04:00:00Z' },
  pull: { status: 'done', requestedAt: '2026-10-27T03:50:00Z', finishedAt: '2026-10-27T04:00:00Z' },
  siblings,
  builtBy: {
    ...builtBy,
    accounts: 186,
    counts: [
      { tier: 7, count: 3 },
      { tier: 6, count: 11 },
      { tier: 4, count: 40 },
    ],
  },
  starsBest: starsBestFull,
};

/** Its code and contributor facts for the last 12 months. */
export const bigRepoPulse = { ...pulseFacts, sharedContributorOrgs: [] };

/** The languages with ranked repositories: 5.3M in all, 412,000 in TypeScript. */
export const repoLanguages: RepoLanguagesQuery['repoLanguages'] = [
  { language: 'JavaScript', repos: 1_310_000, stars: 0 },
  { language: 'Python', repos: 1_120_000, stars: 0 },
  { language: 'TypeScript', repos: 412_000, stars: 0 },
  { language: null, repos: 2_458_000, stars: 0 },
];

/** The global tier table, best bucket first: five levels of seven tiers over 5.3M repositories. */
export const repoRankTiers: NonNullable<RepoRankTiersQuery['repoRankTiers']> = {
  repos: 5_300_000,
  tiers: Array.from({ length: 35 }, (_, index) => ({
    tier: 7 - Math.floor(index / 5),
    level: 5 - (index % 5),
    minRank: index === 0 ? 1 : Math.round(49 * 1.6 ** index),
    maxRank: Math.round(49 * 1.6 ** (index + 1)),
    minValue: Math.round(175_007 / 1.5 ** index),
  })),
};

/**
 * `brightfern/tidepool`'s badge data: a two-week-old repository with 13 stars, low in the ranking, its whole star
 * history read on a visitor's pull. Badges show the honest count only.
 */
export const youngRepoFacts: RepoFacts = {
  ...repoSmall,
  nameWithOwner: 'brightfern/tidepool',
  language: 'Go',
  stars: 13,
  gainedThisMonth: 13,
  monthStarts: { '2026-10-01': 0 },
  history: {
    points: [{ date: '2026-10-17T00:00:00Z', stars: 0 }],
    current: { date: '2026-10-27T00:00:00Z', stars: 13 },
    complete: true,
  },
  rank: { s: 1_384_200, sM: 1_384_200, l: 61_400, lM: 61_400, language: 'Go', tier: { tier: 1, level: 5 } },
  totals: { repos: 5_300_000, languageRepos: 231_000 },
};

/**
 * `brightfern/tidepool` on its page: made on 17 Oct 2026, 13 stars, no builders or stargazers of note yet. GitHub shows
 * 219: 206 came from suspected fake accounts and don't count.
 */
export const youngRepo: Repo = {
  githubId: 'R_brightfern_tidepool',
  owner: 'brightfern',
  name: 'tidepool',
  nameWithOwner: youngRepoFacts.nameWithOwner,
  ownerAvatarUrl: 'https://avatars.githubusercontent.com/u/brightfern?v=4',
  description: 'A tiny habit tracker for the terminal.',
  language: 'Go',
  stars: youngRepoFacts.stars,
  starsCheck: { notCounted: 206, githubStars: 219 },
  gainedThisMonth: youngRepoFacts.gainedThisMonth,
  isArchived: false,
  isInOrganization: false,
  createdAt: '2026-10-17T08:40:00Z',
  renamedTo: null,
  burstMonths: [],
  rank: {
    language: 'Go',
    s: 1_384_200,
    sM: 1_384_200,
    l: 61_400,
    lM: 61_400,
    tier: { tier: 1, level: 5, minRank: 1_210_001, maxRank: 1_460_000, minValue: 12 },
    languageTier: { tier: 1, level: 5 },
  },
  history: youngRepoFacts.history && { ...youngRepoFacts.history, readAt: '2026-10-27T11:20:00Z' },
  pull: { status: 'done', requestedAt: '2026-10-27T11:10:00Z', finishedAt: '2026-10-27T11:20:00Z' },
  siblings: [],
  builtBy: { accounts: 1, counts: [{ tier: 2, count: 1 }], top: [] },
  starsBest: null,
};
