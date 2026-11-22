import type { WallOrder } from './types';
import type { RepoUnsungHeroFacts } from './unsung-hero-badge';
import { packageKeyOf, type RegistryId } from '@/lib/packages/registries';

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
  /** The repository's GitHub node id; `null` where the read does not ask for it (link-preview cards). */
  githubId: string | null;
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
  /** Its latest week as Unsung hero; left out when it never was one. */
  unsungHero?: RepoUnsungHeroFacts;
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

/** A repository with 100+ stars that depends on a package directly. */
export type PackageDependentFacts = {
  nameWithOwner: string;
  ownerAvatarUrl: string | null;
  stars: number;
  archived: boolean;
};

/** One point of a package's downloads history: the week's Monday, or the month's first day (UTC). */
export type DownloadsPoint = { start: string; downloads: number };

/**
 * A package's downloads up to `through`, the last day counted: the last 7 days and the 7 before, the last 30 days and
 * the 30 before, the last 52 whole weeks and the 52 before (`null` until the history reaches back that far), downloads
 * a week per star of its repository (`null` without one), and the weekly and monthly totals, oldest first. On a
 * registry counted a month at a time there is no week (`lastWeek`, `previousWeek` and `perStar` are `null`, `weeks`
 * is empty): `last30Days` is the month just ended, `previous30Days` the month before.
 */
export type PackageDownloadsFacts = {
  through: string;
  lastWeek: number | null;
  previousWeek: number | null;
  last30Days: number;
  previous30Days: number;
  last52Weeks: number;
  previous52Weeks: number | null;
  perStar: number | null;
  weeks: DownloadsPoint[];
  months: DownloadsPoint[];
};

/**
 * A package GitRanks has read. Its dependents are the repositories with 100+ stars that use it directly: their
 * count, their stars added up, and the most-starred few.
 */
export type PackageFacts = {
  kind: 'package';
  registry: RegistryId;
  /** The registry's spelling: on npm `x` or `@scope/x`. */
  name: string;
  /** The repository that publishes it, when GitRanks has its page. */
  repo: { nameWithOwner: string; stars: number } | null;
  /** `owner/name` of that repository when GitRanks has no page for it; `null` when the package names none. */
  repositoryName: string | null;
  dependentsCount: number;
  dependentsStars: number;
  /** The most-starred dependents, most-starred first. */
  dependents: PackageDependentFacts[];
  /** `null` before its downloads were first read. */
  downloads: PackageDownloadsFacts | null;
};

export type EntityFacts = RepoFacts | UserFacts | OrgFacts | PackageFacts;

/**
 * A package GitRanks holds and has not read yet: it has no badges until its first read, which comes soon, so its
 * not-found answer is kept for minutes only.
 */
export const PACKAGE_NOT_READ = 'not-read';
export type PackageNotRead = typeof PACKAGE_NOT_READ;

/** How a package's badges name it in their URL, after the kind: `<registry>/<name>`. */
export const packageBadgeName = (pkg: Pick<PackageFacts, 'registry' | 'name'>) => packageKeyOf(pkg);

/** The entity's wall in an order, if it has one; a package has none. */
export const wallOf = (entity: EntityFacts, order: WallOrder): ContributorsWall | null =>
  entity.kind === 'package' ? null : (entity.contributorsWall[order] ?? null);

/**
 * Whether GitRanks has yet to read the entity from GitHub, so its badges have little or nothing to show until it
 * does: a repository whose star history was never read, or a developer without a single count (their first read is
 * still running). Organizations have no such state, nor packages: a package GitRanks has not read has no badges.
 */
export function awaitsRead(entity: EntityFacts): boolean {
  switch (entity.kind) {
    case 'repo':
      return !entity.history;
    case 'user':
      return entity.s === null && entity.c === null && entity.f === null;
    case 'org':
    case 'package':
      return false;
  }
}
