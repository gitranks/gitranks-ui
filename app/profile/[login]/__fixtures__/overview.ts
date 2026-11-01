import type { ProfileOverviewExtras } from '@/graphql/helpers/fetch-profile-overview-extras';
import type { PageProfileOverviewQuery } from '@/types/generated/graphql';

export type ProfileUser = NonNullable<PageProfileOverviewQuery['user']>;
type Repository = NonNullable<ProfileUser['repositories']>[number];

/** A small ranked profile with the given global ranks and no tiers. */
export const profileUser = (rankGlobal: ProfileUser['rankGlobal']): ProfileUser => ({
  githubId: '1',
  login: 'contributor',
  avatarUrl: 'https://avatars.example/1',
  s: 120,
  c: 40,
  repositoriesCount: 3,
  contributedRepoCount: 5,
  rankGlobal,
  tiersGlobal: { sUsers: 1000, cUsers: 2000, fUsers: 3000, sTiers: [], cTiers: [], fTiers: [] },
});

/** Ranked worldwide and in Germany, with a month of rank and score history. */
export const rankedProfile: ProfileUser = {
  ...profileUser({ s: 50, c: 200, f: 7, snapshots: { '2026-10-01': { s: 60, c: 210, f: 7 } } }),
  country: 'Germany',
  rankCountry: { s: 4, c: 20, f: 1 },
  snapshots: { '2026-10-01': { s: 100, c: 30 } },
};

/** Seven tiers of five levels over `users` positions, best first. */
const tiersOf = (users: number) =>
  Array.from({ length: 35 }, (_, index) => ({
    tier: 7 - Math.floor(index / 5),
    level: 5 - (index % 5),
    minRank: Math.round((index * users) / 35) + 1,
    maxRank: Math.round(((index + 1) * users) / 35),
    minValue: Math.round(200_000 / (1 + index * 2)),
  }));

const tierTable = (sUsers: number, cUsers: number, fUsers: number) => ({
  sUsers,
  cUsers,
  fUsers,
  sTiers: tiersOf(sUsers),
  cTiers: tiersOf(cUsers),
  fTiers: tiersOf(fUsers),
});

const TYPESCRIPT = { name: 'TypeScript', color: '#3178c6' };
const RUST = { name: 'Rust', color: '#dea584' };
const GO = { name: 'Go', color: '#00ADD8' };
const CSS = { name: 'CSS', color: '#663399' };

const repository = (
  name: string,
  stargazerCount: number,
  languages: { name: string; color: string }[],
  rank: Repository['rank'] = null,
  extra: Partial<Repository> = {},
): Repository => ({
  name,
  url: `https://github.com/${name.includes('/') ? name : `octo-dev/${name}`}`,
  createdAt: '2019-03-14T10:00:00Z',
  pushedAt: '2026-10-25T18:00:00Z',
  releasesCount: 24,
  stargazerCount,
  isArchived: false,
  forkCount: Math.round(stargazerCount / 9),
  languages: languages.map((language, index) => ({ ...language, size: 100_000 >> index })),
  rank,
  ...extra,
});

/** The month starts of a score that grew to `now` over two years. */
const history = (now: { s: number; c: number; f: number }) =>
  Object.fromEntries(
    Array.from({ length: 24 }, (_, index) => {
      const date = new Date(Date.UTC(2024, 10 + index, 1));
      const share = 0.6 + (0.4 * index) / 24;
      return [
        date.toISOString().slice(0, 10),
        { s: Math.round(now.s * share), c: Math.round(now.c * share), f: Math.round(now.f * share) },
      ];
    }),
  );

/**
 * A developer near the top of every ranking, in Ukraine: the same `octo-dev` as the badge fixtures' `userBig`, with
 * repositories, contributions, languages, a timeline and links.
 */
export const strongProfile: ProfileUser = {
  githubId: '1001',
  login: 'octo-dev',
  name: 'Olena Kovalenko',
  avatarUrl: 'https://avatars.githubusercontent.com/u/1001?v=4',
  location: 'Kyiv, Ukraine',
  country: 'Ukraine',
  countryFlag: '🇺🇦',
  company: '@nebula',
  email: 'olena@example.com',
  websiteUrl: 'example.com',
  socialAccounts: {
    totalCount: 2,
    nodes: [
      { displayName: '@octodev', provider: 'TWITTER', url: 'https://x.com/octodev' },
      { displayName: 'octo-dev', provider: 'MASTODON', url: 'https://mastodon.social/@octodev' },
    ],
  },
  organizations: [
    { login: 'nebula', name: 'Nebula', avatarUrl: 'https://avatars.githubusercontent.com/u/org1?v=4' },
    { login: 'fern-lang', name: 'Fern', avatarUrl: 'https://avatars.githubusercontent.com/u/org3?v=4' },
  ],
  f: 31_000,
  followingCount: 112,
  githubCreatedAt: '2012-05-03T09:00:00Z',
  githubFetchedAt: '2026-10-27T06:00:00Z',
  firstSeenAt: '2023-02-01T00:00:00Z',
  fetchingStatus: null,
  fetchingUpdatedAt: null,
  s: 198_400,
  c: 12_000,
  repositoriesCount: 142,
  contributedRepoCount: 61,
  rankGlobal: {
    s: 13,
    sM: 15,
    c: 102,
    cM: 98,
    f: 40,
    fM: 40,
    snapshots: Object.fromEntries(
      ['2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01'].map((date, index) => [
        date,
        { s: 21 - index * 2, c: 120 - index * 4, f: 44 - index },
      ]),
    ),
  },
  rankCountry: { s: 2, sM: 2, c: 3, cM: 4, f: 1, fM: 1 },
  tiersGlobal: tierTable(1_657_241, 1_101_747, 3_303_658),
  snapshots: history({ s: 198_400, c: 12_000, f: 31_000 }),
  sLangs: [
    {
      ...TYPESCRIPT,
      size: 4_100_000,
      score: 121_000,
      sources: [
        { name: 'orbit', stargazerCount: 88_000, percentage: 0.92, year: 2019 },
        { name: 'tiny-store', stargazerCount: 21_400, percentage: 0.88, year: 2021 },
      ],
    },
    {
      ...RUST,
      size: 1_900_000,
      score: 54_000,
      sources: [{ name: 'quill', stargazerCount: 51_200, percentage: 0.97, year: 2022 }],
    },
    {
      ...GO,
      size: 610_000,
      score: 16_800,
      sources: [{ name: 'tide', stargazerCount: 16_100, percentage: 0.9, year: 2020 }],
    },
    {
      ...CSS,
      size: 120_000,
      score: 2_600,
      sources: [{ name: 'orbit', stargazerCount: 88_000, percentage: 0.03, year: 2019 }],
    },
  ],
  cLangs: [
    {
      ...TYPESCRIPT,
      size: 820_000,
      sources: [
        {
          name: 'nebula/ui',
          stargazerCount: 54_210,
          percentage: 0.7,
          year: 2026,
          linesAdded: 41_200,
          linesRemoved: 12_800,
          prsCount: 214,
          url: 'https://github.com/nebula/ui',
        },
      ],
    },
    {
      ...RUST,
      size: 300_000,
      sources: [
        {
          name: 'fern-lang/fern',
          stargazerCount: 12_400,
          percentage: 0.8,
          year: 2026,
          linesAdded: 9_100,
          linesRemoved: 2_300,
          prsCount: 38,
          url: 'https://github.com/fern-lang/fern',
        },
      ],
    },
  ],
  starsReview: null,
  repositories: [
    repository('orbit', 88_000, [TYPESCRIPT, CSS], { s: 412, tier: { tier: 7, level: 4 } }),
    repository('quill', 51_200, [RUST], { s: 1_310, tier: { tier: 7, level: 2 } }),
    repository('tiny-store', 21_400, [TYPESCRIPT], { s: 6_020, tier: { tier: 6, level: 3 } }),
    repository('tide', 16_100, [GO], { s: 8_840, tier: { tier: 6, level: 1 } }),
    repository('dotfiles', 2_300, [], { s: 120_400, tier: { tier: 4, level: 2 } }, { isArchived: true }),
  ],
  contributions: [
    {
      year: 2026,
      prsCount: 61,
      mergedPrsCount: 58,
      linesAdded: 41_200,
      linesRemoved: 12_800,
      repository: repository('nebula/ui', 54_210, [TYPESCRIPT, CSS], { s: 1_204, tier: { tier: 7, level: 2 } }),
    },
    {
      year: 2026,
      prsCount: 14,
      mergedPrsCount: 12,
      linesAdded: 9_100,
      linesRemoved: 2_300,
      repository: repository('fern-lang/fern', 12_400, [RUST], { s: 9_310, tier: { tier: 6, level: 1 } }),
    },
    {
      year: 2025,
      prsCount: 6,
      mergedPrsCount: 5,
      linesAdded: 1_240,
      linesRemoved: 310,
      repository: repository('quill-db/quill', 8_800, [GO], { s: 14_002, tier: { tier: 5, level: 4 } }),
    },
  ],
  timeline: [
    { createdAt: '2026-10-21T06:00:00Z', changes: { followersCount: { b: 30_410, a: 31_000 } } },
    { createdAt: '2026-09-02T06:00:00Z', changes: { company: { b: '@fern-lang', a: '@nebula' } } },
    { createdAt: '2026-06-14T06:00:00Z', changes: { location: { b: 'Lviv, Ukraine', a: 'Kyiv, Ukraine' } } },
  ],
};

/** Ranked counts the summary cites for the strong profile. */
/**
 * The strong profile when some of its stars don't count: `tiny-store` shows 27,900 on GitHub, 6,500 of them from
 * suspected fake accounts, so the totals stay as they are and the GitHub counts are struck through beside them.
 */
export const strongProfileStarsNotCounted: ProfileUser = {
  ...strongProfile,
  starsNotCounted: { stars: 6_500, repositories: 1 },
  repositories: strongProfile.repositories?.map((repo) =>
    repo.name === 'tiny-store' ? { ...repo, githubStars: 27_900, starsNotCounted: 6_500 } : repo,
  ),
};

export const strongExtras: ProfileOverviewExtras = {
  rankedGlobal: { sUsers: 1_657_241, cUsers: 1_101_747, fUsers: 3_303_658 },
  rankedCountry: { sUsers: 31_000, cUsers: 22_400, fUsers: 61_000 },
  complete: true,
};

/**
 * A developer GitRanks found last week: two small repositories, a handful of followers, below every ranking's
 * minimum.
 */
export const newcomerProfile: ProfileUser = {
  githubId: '2002',
  login: 'new-dev',
  name: null,
  avatarUrl: 'https://avatars.githubusercontent.com/u/2002?v=4',
  location: 'Porto',
  country: 'Portugal',
  countryFlag: '🇵🇹',
  company: null,
  email: null,
  websiteUrl: null,
  socialAccounts: { totalCount: 0, nodes: [] },
  organizations: [],
  f: 3,
  followingCount: 9,
  githubCreatedAt: '2025-11-20T09:00:00Z',
  githubFetchedAt: '2026-10-26T06:00:00Z',
  firstSeenAt: '2026-10-21T00:00:00Z',
  fetchingStatus: null,
  fetchingUpdatedAt: null,
  s: 2,
  c: 0,
  repositoriesCount: 2,
  contributedRepoCount: 0,
  rankGlobal: null,
  rankCountry: null,
  tiersGlobal: tierTable(1_657_241, 1_101_747, 3_303_658),
  snapshots: null,
  sLangs: [
    {
      ...TYPESCRIPT,
      size: 18_000,
      score: 2,
      sources: [{ name: 'todo-app', stargazerCount: 2, percentage: 1, year: 2026 }],
    },
  ],
  cLangs: [],
  starsReview: null,
  repositories: [
    repository('todo-app', 2, [TYPESCRIPT], null, {
      url: 'https://github.com/new-dev/todo-app',
      createdAt: '2026-09-12T10:00:00Z',
      pushedAt: '2026-10-24T18:00:00Z',
      releasesCount: 0,
    }),
    repository('new-dev', 0, [], null, {
      url: 'https://github.com/new-dev/new-dev',
      createdAt: '2025-11-20T10:00:00Z',
      pushedAt: '2026-10-02T18:00:00Z',
      releasesCount: 0,
    }),
  ],
  contributions: [],
  timeline: [],
};

/** Ranked counts the newcomer's summary would cite: they are in none of them yet. */
export const newcomerExtras: ProfileOverviewExtras = {
  rankedGlobal: strongExtras.rankedGlobal,
  rankedCountry: { sUsers: 8_900, cUsers: 6_100, fUsers: 17_400 },
  complete: true,
};
