import type { ContributorsWall, OrgFacts, RepoFacts, TierTable, UserFacts, UserTierLists } from './facts';

/** Made-up entities for the specs, one per size bucket (spec §3.9). Day 20 of October 2026. */
export const NOW = new Date('2026-10-20T12:00:00Z');

const tiers = (perLevel: number): TierTable =>
  Array.from({ length: 35 }, (_, index) => ({
    tier: 7 - Math.floor(index / 5),
    level: 5 - (index % 5),
    minRank: index * perLevel + 1,
    maxRank: (index + 1) * perLevel,
    minValue: 100_000 - index * 2_500,
  }));

const tierLists = (users: number): UserTierLists => ({
  users: { s: users, c: Math.round(users / 3), f: Math.round(users / 2) },
  tiers: { s: tiers(users / 35), c: tiers(users / 105), f: tiers(users / 70) },
});

const series = (values: number[]) => ({
  activeLinked: values.map((value) => Math.round(value * 0.8)),
  activeAnonymous: values.map((value) => value - Math.round(value * 0.8)),
  newContributors: values.map((value) => Math.round(value / 7)),
});

const PULSE_SERIES = {
  ...series([128, 141, 120, 150, 147, 163, 158, 171, 180, 166, 184, 192]),
  months: [
    '2025-10',
    '2025-11',
    '2025-12',
    '2026-01',
    '2026-02',
    '2026-03',
    '2026-04',
    '2026-05',
    '2026-06',
    '2026-07',
    '2026-08',
    '2026-09',
  ],
};

const person = (index: number, tier: number) => ({
  login: `dev-${index}`,
  avatarUrl: null,
  tier,
  level: 1 + (index % 5),
});

export const wallOf = (count: number, total = count): ContributorsWall => ({
  total,
  entries: Array.from({ length: count }, (_, index) => ({
    login: `dev-${index}`,
    avatarUrl: null,
    tier: index < 40 ? 7 - Math.floor(index / 7) : null,
    level: 3,
  })),
});

const repoBase: RepoFacts = {
  kind: 'repo',
  nameWithOwner: 'acme/fastqueue',
  language: 'Rust',
  stars: 42,
  gainedThisMonth: 6,
  monthStarts: { '2026-09-01': 30, '2026-10-01': 36 },
  history: null,
  rank: { s: 412_060, sM: 418_400, l: 3_810, lM: 3_900, language: 'Rust', tier: { tier: 2, level: 4 } },
  totals: { repos: 5_300_000, languageRepos: 91_200 },
  tierLevels: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5 },
  starsBest: null,
  siblings: null,
  builtBy: null,
  pulse: null,
  pulseSeries: null,
};

/** 5–100 stars: ranked, a language rank, a young race. */
export const repoSmall: RepoFacts = repoBase;

/** 100–1k stars: a race behind last month. */
export const repoMid: RepoFacts = {
  ...repoBase,
  stars: 812,
  gainedThisMonth: 38,
  monthStarts: { '2026-08-01': 700, '2026-09-01': 726, '2026-10-01': 774 },
  rank: { s: 41_206, sM: 41_518, l: 38, lM: 42, language: 'Rust', tier: { tier: 4, level: 3 } },
  totals: { repos: 5_300_000, languageRepos: 9_120 },
};

/** 1k+ stars: history, stargazers, pulse, a sibling. */
export const repoBig: RepoFacts = {
  ...repoBase,
  nameWithOwner: 'nebula/ui',
  language: 'TypeScript',
  stars: 54_210,
  gainedThisMonth: 1_912,
  monthStarts: { '2026-08-01': 50_100, '2026-09-01': 51_400, '2026-10-01': 52_298 },
  history: {
    points: [
      { date: '2021-03-14T00:00:00Z', stars: 0 },
      ...Array.from({ length: 20 }, (_, index) => ({
        date: new Date(Date.UTC(2025, 1 + index, 1)).toISOString(),
        stars: index < 19 ? 30_000 + index * 1_100 + (index > 14 ? 600 : 0) : 52_298,
      })),
    ],
    current: { date: '2026-10-20T00:00:00Z', stars: 54_210 },
    complete: true,
  },
  rank: { s: 1_204, sM: 1_250, l: 112, lM: 118, language: 'TypeScript', tier: { tier: 7, level: 2 } },
  totals: { repos: 5_300_000, languageRepos: 412_000 },
  starsBest: {
    total: 1_284,
    counts: [
      { tier: 7, count: 214 },
      { tier: 6, count: 1_031 },
      { tier: 5, count: 39 },
    ],
    top: [person(0, 7), person(1, 7), person(2, 7), person(3, 6), person(4, 6), person(5, 6), person(6, 5)],
  },
  siblings: [{ nameWithOwner: 'vercel/next.js', share: 0.33 }],
  builtBy: [
    { tier: 7, count: 3 },
    { tier: 6, count: 11 },
  ],
  pulse: { lastMonth: '2026-09', active12: 186, new12: 41 },
  pulseSeries: PULSE_SERIES,
};

/** The facts the API does not serve yet, as they will look. */
export const repoBigLater: RepoFacts = {
  ...repoBig,
  rankGoal: { targetRank: 1_000, scope: 'global', needed: 3_120, unit: 'stars' },
  pulse: { lastMonth: '2026-09', active12: 186, new12: 41, countryCount: 23, contributors60: 2_410 },
  contributorsWall: { popular: wallOf(70, 186), contributions: wallOf(40, 186) },
};

export const repoMidLater: RepoFacts = {
  ...repoMid,
  rankGoal: { targetRank: 25, scope: 'language', language: 'Rust', needed: 8, unit: 'stars' },
};

/** Fewer than 5 stars: known but not ranked. */
export const repoUnranked: RepoFacts = {
  ...repoBase,
  stars: 3,
  gainedThisMonth: 0,
  monthStarts: null,
  rank: null,
  totals: { repos: 5_300_000, languageRepos: null },
};

const ranks = (s: number | null, c: number | null, f: number | null) => ({
  s,
  c,
  f,
  sM: s ? s + 312 : null,
  cM: c ? c - 4 : null,
  fM: f,
  sProvisional: null,
  cProvisional: null,
  fProvisional: null,
});

const userBase: UserFacts = {
  kind: 'user',
  login: 'octo-dev',
  avatarUrl: null,
  country: 'Ukraine',
  s: 42,
  c: 410,
  f: 12,
  snapshots: {
    '2026-08-01': { s: 30, c: 380, f: 10 },
    '2026-09-01': { s: 36, c: 395, f: 11 },
    '2026-10-01': { s: 39, c: 401, f: 12 },
  },
  rankGlobal: ranks(910_200, 8_210, 2_400_000),
  rankCountry: ranks(9_120, 112, 30_100),
  rankSnapshots: { '2026-09-01': { s: 912_000 }, '2026-10-01': { s: 910_512 } },
  tiersGlobal: tierLists(3_300_000),
  tiersCountry: tierLists(61_000),
  languages: [{ name: 'Rust', rank: 61_000, rankM: 61_400, total: 610_207 }],
};

/** Under 100 own stars: ranked by contributions and in a country. */
export const userSmall: UserFacts = userBase;

/** 100–1k own stars. */
export const userMid: UserFacts = {
  ...userBase,
  s: 640,
  snapshots: {
    '2026-08-01': { s: 560, c: 380, f: 10 },
    '2026-09-01': { s: 590, c: 395, f: 11 },
    '2026-10-01': { s: 602, c: 401, f: 12 },
  },
  rankGlobal: ranks(41_204, 8_210, 2_400_000),
  rankCountry: ranks(512, 112, 30_100),
  rankSnapshots: { '2026-09-01': { s: 43_000 }, '2026-10-01': { s: 41_516 } },
  languages: [
    { name: 'Rust', rank: 14_002, rankM: 14_100, total: 610_207 },
    { name: 'TypeScript', rank: 120_000, rankM: 121_000, total: 2_100_000 },
  ],
};

/** 1k+ own stars, two years of snapshots. */
export const userBig: UserFacts = {
  ...userBase,
  s: 198_400,
  c: 12_000,
  f: 31_000,
  snapshots: Object.fromEntries(
    Array.from({ length: 25 }, (_, index) => {
      const date = new Date(Date.UTC(2024, 9 + index, 1));
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
      return [key, { s: 120_000 + index * 3_200, c: 9_000 + index * 120, f: 25_000 + index * 240 }];
    }),
  ),
  rankGlobal: ranks(13, 102, 40),
  rankCountry: ranks(2, 3, 1),
  rankSnapshots: { '2026-09-01': { s: 14 }, '2026-10-01': { s: 13 } },
  languages: [{ name: 'Rust', rank: 14, rankM: 15, total: 610_207 }],
};

export const userBigLater: UserFacts = {
  ...userBig,
  rankGoal: { s: { targetRank: 10, scope: 'global', needed: 5_210, unit: 'stars' } },
  contributorsWall: { popular: wallOf(70, 142) },
  wallRepos: 9,
};

/** Below every ranking: known, nothing to show. */
export const userUnranked: UserFacts = {
  ...userBase,
  s: 2,
  c: 0,
  f: 1,
  country: null,
  snapshots: null,
  rankGlobal: null,
  rankCountry: null,
  rankSnapshots: null,
  languages: [],
};

const orgBase: OrgFacts = {
  kind: 'org',
  login: 'nebula',
  avatarUrl: null,
  s: 640,
  reposCount: 12,
  rank: { s: 41_022, sM: 41_100 },
  topRepos: [{ nameWithOwner: 'nebula/cli', stars: 410, rank: 88_311 }],
  pulse: null,
  pulseSeries: null,
};

export const orgSmall: OrgFacts = orgBase;

export const orgMid: OrgFacts = {
  ...orgBase,
  s: 4_210,
  reposCount: 38,
  rank: { s: 2_310, sM: 2_330 },
  topRepos: [
    { nameWithOwner: 'nebula/ui', stars: 3_100, rank: 21_204 },
    { nameWithOwner: 'nebula/cli', stars: 900, rank: 88_311 },
  ],
};

export const orgBig: OrgFacts = {
  ...orgBase,
  s: 312_000,
  reposCount: 418,
  rank: { s: 12, sM: 15 },
  topRepos: [
    { nameWithOwner: 'nebula/ui', stars: 54_210, rank: 1_204 },
    { nameWithOwner: 'nebula/cli', stars: 22_000, rank: 8_311 },
    { nameWithOwner: 'nebula/icons', stars: 9_000, rank: 21_940 },
  ],
  pulse: { lastMonth: '2026-09', active12: 2_104, new12: 318 },
  pulseSeries: {
    ...PULSE_SERIES,
    activeLinked: PULSE_SERIES.activeLinked.map((value) => value * 9),
    activeAnonymous: PULSE_SERIES.activeAnonymous.map((value) => value * 9),
  },
};

export const orgBigLater: OrgFacts = {
  ...orgBig,
  orgRankTotal: 336_901,
  reposOver1k: 14,
  pulse: { lastMonth: '2026-09', active12: 2_104, new12: 318, countryCount: 61, contributors60: 9_800 },
  contributorsWall: { popular: wallOf(70, 2_104), newest: wallOf(30, 2_104) },
};

/** An organization with no ranked repositories. */
export const orgUnranked: OrgFacts = { ...orgBase, s: 0, rank: null, topRepos: [] };
