import type { WallOrder } from './types';

/** What a badge knows about its entity: the API's answer, flattened. */

export type TierRef = { tier: number; level: number };

export type TierCount = { tier: number; count: number };

/** A person on a stargazer list, a builder list or a contributors wall. */
export type Person = { login: string | null; avatarUrl: string | null; tier: number; level: number };

/** The next round rank and what it still takes (spec §3.4). */
export type RankGoal = {
  targetRank: number;
  scope: 'global' | 'language' | 'country';
  language?: string | null;
  country?: string | null;
  needed: number;
  unit: 'stars' | 'contributionStars' | 'followers';
};

/** A contributors wall, built ahead of time (spec §3.8). */
export type ContributorsWall = {
  total: number;
  entries: { login: string; avatarUrl: string | null; tier: number | null; level: number | null }[];
};

/** An entity's walls by order; a developer has no `newest`. */
export type ContributorsWalls = Partial<Record<WallOrder, ContributorsWall | null>>;

export type PulseFacts = {
  /** The last completed month, `YYYY-MM`. */
  lastMonth: string;
  active12: number;
  new12: number;
  /** Distinct countries of the people active in 12 months. */
  countryCount: number;
  /** People with a GitHub account who landed a change in 60 months. */
  contributors60: number;
};

export type PulseSeriesFacts = {
  months: string[];
  activeLinked: number[];
  activeAnonymous: number[];
  newContributors: (number | null)[];
};

export type StarPoint = { date: string; stars: number };

export type RepoFacts = {
  kind: 'repo';
  nameWithOwner: string;
  language: string | null;
  stars: number;
  gainedThisMonth: number | null;
  /** Stars on the 1st of each month, by month key. */
  monthStarts: Record<string, number> | null;
  /** `complete` when the history holds every star since the repository's start, not just recent months. */
  history: { points: StarPoint[]; current: StarPoint; complete: boolean } | null;
  rank: {
    s: number | null;
    sM: number | null;
    l: number | null;
    lM: number | null;
    language: string | null;
    tier: TierRef | null;
  } | null;
  /** Ranked repositories, all and in the repository's language. */
  totals: { repos: number | null; languageRepos: number | null };
  /** How many levels each repository tier has. */
  tierLevels: Record<number, number>;
  starsBest: { total: number; counts: TierCount[]; top: Person[] } | null;
  siblings: { nameWithOwner: string; share: number }[] | null;
  /** Active builders per developer tier. */
  builtBy: TierCount[] | null;
  pulse: PulseFacts | null;
  pulseSeries: PulseSeriesFacts | null;
  rankGoal: RankGoal | null;
  contributorsWall: ContributorsWalls;
};

export type UserRanks = {
  s: number | null;
  c: number | null;
  f: number | null;
  sM: number | null;
  cM: number | null;
  fM: number | null;
  sProvisional: number | null;
  cProvisional: number | null;
  fProvisional: number | null;
};

export type TierTable = { tier: number; level: number; minRank: number; maxRank: number; minValue: number }[];

export type UserTierLists = {
  users: { s: number; c: number; f: number };
  tiers: { s: TierTable; c: TierTable; f: TierTable };
};

export type UserFacts = {
  kind: 'user';
  login: string;
  avatarUrl: string | null;
  country: string | null;
  s: number | null;
  c: number | null;
  f: number | null;
  /** Scores on the 1st of each month, by month key. */
  snapshots: Record<string, { s?: number | null; c?: number | null; f?: number | null }> | null;
  rankGlobal: UserRanks | null;
  rankCountry: UserRanks | null;
  /** Global ranks on the 1st of each month, by month key. */
  rankSnapshots: Record<string, { s?: number | null; c?: number | null; f?: number | null }> | null;
  tiersGlobal: UserTierLists | null;
  tiersCountry: UserTierLists | null;
  /** Star-ranked languages, best first: the global rank and how many developers that list holds. */
  languages: { name: string; rank: number | null; rankM: number | null; total: number | null }[];
  /** By ranking. */
  rankGoal: Record<'s' | 'c' | 'f', RankGoal | null>;
  contributorsWall: ContributorsWalls;
  /** How many of their own repositories the wall spans. */
  wallRepos: number | null;
};

export type OrgFacts = {
  kind: 'org';
  login: string;
  avatarUrl: string | null;
  s: number | null;
  reposCount: number | null;
  rank: { s: number | null; sM: number | null } | null;
  topRepos: { nameWithOwner: string; stars: number; rank: number | null }[];
  pulse: PulseFacts | null;
  pulseSeries: PulseSeriesFacts | null;
  /** Ranked organizations, the top share's denominator. */
  orgRankTotal: number | null;
  /** Repositories with 1,000+ stars. */
  reposOver1k: number;
  contributorsWall: ContributorsWalls;
};

export type EntityFacts = RepoFacts | UserFacts | OrgFacts;

/** The entity's wall in an order, if it has one. */
export const wallOf = (entity: EntityFacts, order: WallOrder): ContributorsWall | null =>
  entity.contributorsWall[order] ?? null;
