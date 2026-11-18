import { cacheLife, cacheTag } from 'next/cache';

import { toOrgCardFacts, toRepoCardFacts, toUserCardFacts } from './card-facts';
import type {
  ContributorsWall,
  ContributorsWalls,
  EntityFacts,
  OrgFacts,
  PackageFacts,
  PulseFacts,
  RankGoal,
  RepoFacts,
  TierTable,
  UserFacts,
  UserRanks,
  UserTierLists,
} from './facts';
import { readsSoon } from './pending';
import { BADGE_DEPENDENTS, BadgePackageDocument, type BadgePackageQuery } from '@/graphql/badge-package';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { packageCacheTag } from '@/lib/packages/package-paths';
import {
  BadgeOrgCardDocument,
  BadgeOrgDocument,
  type BadgeOrgQuery,
  type BadgeRankGoalFragment,
  BadgeRepoCardDocument,
  BadgeRepoDocument,
  type BadgeRepoQuery,
  BadgeUserCardDocument,
  BadgeUserDocument,
  type BadgeUserQuery,
  type BadgeWallFragment,
  RankGoalScope,
  RankGoalUnit,
} from '@/types/generated/graphql';
import { profileCacheTag } from '@/utils/profile-refresh';
import { getRepoCacheTag } from '@/utils/repo-paths';

type Json = Record<string, unknown> | null | undefined;

const asNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** A JSON object of month keys to numbers. */
function numberRecord(json: unknown): Record<string, number> | null {
  if (!json || typeof json !== 'object') return null;
  const entries = Object.entries(json as Record<string, unknown>)
    .map(([key, value]) => [key, asNumber(value)] as const)
    .filter((entry): entry is readonly [string, number] => entry[1] !== null);
  return Object.fromEntries(entries);
}

/** A JSON object of month keys to `{ s, c, f }`. */
function scoreRecord(json: unknown): UserFacts['snapshots'] {
  if (!json || typeof json !== 'object') return null;
  return Object.fromEntries(
    Object.entries(json as Record<string, Json>).map(([key, value]) => [
      key,
      { s: asNumber(value?.s), c: asNumber(value?.c), f: asNumber(value?.f) },
    ]),
  );
}

const GOAL_SCOPES: Record<RankGoalScope, RankGoal['scope']> = {
  [RankGoalScope.Global]: 'global',
  [RankGoalScope.Language]: 'language',
  [RankGoalScope.Country]: 'country',
};

const GOAL_UNITS: Record<RankGoalUnit, RankGoal['unit']> = {
  [RankGoalUnit.Stars]: 'stars',
  [RankGoalUnit.ContributionStars]: 'contributionStars',
  [RankGoalUnit.Followers]: 'followers',
};

export function toRankGoal(goal: BadgeRankGoalFragment | null | undefined): RankGoal | null {
  if (!goal) return null;
  return {
    targetRank: goal.targetRank,
    scope: GOAL_SCOPES[goal.scope],
    language: goal.language ?? null,
    country: goal.country ?? null,
    needed: goal.needed,
    unit: GOAL_UNITS[goal.unit],
  };
}

const toWall = (wall: BadgeWallFragment | null | undefined): ContributorsWall | null =>
  wall
    ? {
        total: wall.total,
        entries: wall.entries.map(({ login, avatarUrl, tier, level }) => ({
          login,
          avatarUrl: avatarUrl || null,
          tier: tier ?? null,
          level: level ?? null,
        })),
      }
    : null;

type WallFields = {
  wallPopular?: BadgeWallFragment | null;
  wallContributions?: BadgeWallFragment | null;
  wallNewest?: BadgeWallFragment | null;
};

/** The walls an entity has, by order. */
function toWalls({ wallPopular, wallContributions, wallNewest }: WallFields): ContributorsWalls {
  return { popular: toWall(wallPopular), contributions: toWall(wallContributions), newest: toWall(wallNewest) };
}

type PulseData = {
  lastMonth: string;
  last12: { activeContributors: number; newContributors: number };
  countryCount: number;
  contributors60: number;
};

const toPulse = (pulse: PulseData | null | undefined): PulseFacts | null =>
  pulse
    ? {
        lastMonth: pulse.lastMonth,
        active12: pulse.last12.activeContributors,
        new12: pulse.last12.newContributors,
        countryCount: pulse.countryCount,
        contributors60: pulse.contributors60,
      }
    : null;

type RepoData = BadgeRepoQuery;

export function toRepoFacts({ repo, repoRankTiers, repoLanguages }: RepoData): RepoFacts | null {
  if (!repo) return null;
  const rank = repo.rank;
  const language = rank?.language ?? repo.language ?? null;
  const levels: Record<number, number> = {};
  for (const { tier } of repoRankTiers?.tiers ?? []) {
    levels[tier] = (levels[tier] ?? 0) + 1;
  }

  return {
    kind: 'repo',
    githubId: repo.githubId,
    nameWithOwner: repo.nameWithOwner,
    language: repo.language ?? null,
    stars: repo.stars,
    gainedThisMonth: repo.gainedThisMonth ?? null,
    monthStarts: numberRecord(repo.monthStarts),
    history: repo.history
      ? {
          points: repo.history.points.map(({ date, stars }) => ({ date: String(date), stars })),
          current: { date: String(repo.history.current.date), stars: repo.history.current.stars },
          complete: repo.history.complete,
        }
      : null,
    rank: rank
      ? {
          s: rank.s ?? null,
          sM: rank.sM ?? null,
          l: rank.l ?? null,
          lM: rank.lM ?? null,
          language: rank.language ?? null,
          tier: rank.tier ? { tier: rank.tier.tier, level: rank.tier.level } : null,
        }
      : null,
    totals: {
      repos: repoRankTiers?.repos ?? null,
      languageRepos: language ? (repoLanguages.find((entry) => entry.language === language)?.repos ?? null) : null,
    },
    tierLevels: levels,
    starsBest: repo.starsBest
      ? {
          total: repo.starsBest.total,
          counts: repo.starsBest.counts.map(({ tier, count }) => ({ tier, count })),
          top: repo.starsBest.top.map(({ login, avatarUrl, tier, level }) => ({
            login: login ?? null,
            avatarUrl: avatarUrl ?? null,
            tier,
            level,
          })),
        }
      : null,
    siblings: repo.siblings
      ? repo.siblings.map(({ share, repo: sibling }) => ({ nameWithOwner: sibling.nameWithOwner, share }))
      : null,
    builtBy: repo.builtBy ? repo.builtBy.counts.map(({ tier, count }) => ({ tier, count })) : null,
    pulse: toPulse(repo.pulse),
    pulseSeries: repo.pulseSeries
      ? {
          months: repo.pulseSeries.months,
          activeLinked: repo.pulseSeries.activeLinked,
          activeAnonymous: repo.pulseSeries.activeAnonymous,
          newContributors: repo.pulseSeries.newContributors ?? [],
        }
      : null,
    rankGoal: toRankGoal(repo.rankGoal),
    contributorsWall: toWalls(repo),
  };
}

const NO_RANKS: UserRanks = {
  s: null,
  c: null,
  f: null,
  sM: null,
  cM: null,
  fM: null,
  sProvisional: null,
  cProvisional: null,
  fProvisional: null,
};

function toRanks(ranks: Partial<Record<keyof UserRanks, number | null>> | null | undefined): UserRanks | null {
  if (!ranks) return null;
  return Object.fromEntries(
    Object.keys(NO_RANKS).map((key) => [key, ranks[key as keyof UserRanks] ?? null]),
  ) as UserRanks;
}

type TierLists = NonNullable<NonNullable<BadgeUserQuery['user']>['tiersGlobal']>;

const toTable = (tiers: TierLists['sTiers']): TierTable =>
  tiers.map(({ tier, level, minRank, maxRank, minValue }) => ({ tier, level, minRank, maxRank, minValue }));

function toTierLists(lists: TierLists | null | undefined): UserTierLists | null {
  if (!lists) return null;
  return {
    users: { s: lists.sUsers, c: lists.cUsers, f: lists.fUsers },
    tiers: { s: toTable(lists.sTiers), c: toTable(lists.cTiers), f: toTable(lists.fTiers) },
  };
}

export function toUserFacts({ user }: BadgeUserQuery): UserFacts | null {
  if (!user) return null;
  return {
    kind: 'user',
    login: user.login,
    avatarUrl: user.avatarUrl ?? null,
    country: user.country ?? null,
    s: user.s ?? null,
    c: user.c ?? null,
    f: user.f ?? null,
    snapshots: scoreRecord(user.snapshots),
    rankGlobal: toRanks(user.rankGlobal),
    rankCountry: toRanks(user.rankCountry),
    rankSnapshots: scoreRecord(user.rankGlobal?.snapshots),
    tiersGlobal: toTierLists(user.tiersGlobal),
    tiersCountry: toTierLists(user.tiersCountry),
    languages: (user.sLangs ?? []).map(({ name, rankGlobal, tiersGlobal }) => ({
      name,
      rank: rankGlobal?.s ?? null,
      rankM: rankGlobal?.sM ?? null,
      total: tiersGlobal?.sUsers ?? null,
    })),
    rankGoal: {
      s: toRankGoal(user.goalStars),
      c: toRankGoal(user.goalContributions),
      f: toRankGoal(user.goalFollowers),
    },
    // A developer's wall has no `newest` order.
    contributorsWall: toWalls({ wallPopular: user.wallPopular, wallContributions: user.wallContributions }),
    wallRepos: user.wallPopular?.repos ?? null,
  };
}

export function toOrgFacts({ organization: org, orgRankTotal }: BadgeOrgQuery, login: string): OrgFacts | null {
  if (!org) return null;
  return {
    kind: 'org',
    login: org.login ?? login,
    avatarUrl: org.avatarUrl ?? null,
    s: org.s ?? null,
    reposCount: org.reposCount ?? null,
    reposOver1k: org.reposOver1k,
    orgRankTotal: orgRankTotal || null,
    rank: org.rankOrg ? { s: org.rankOrg.s ?? null, sM: org.rankOrg.sM ?? null } : null,
    topRepos: org.topRepos.map(({ nameWithOwner, stars, rank }) => ({ nameWithOwner, stars, rank: rank?.s ?? null })),
    pulse: toPulse(org.pulse),
    pulseSeries: org.pulseSeries
      ? {
          months: org.pulseSeries.months,
          activeLinked: org.pulseSeries.activeLinked,
          activeAnonymous: org.pulseSeries.activeAnonymous,
          newContributors: org.pulseSeries.newContributors ?? [],
        }
      : null,
    contributorsWall: toWalls(org),
  };
}

/**
 * How long badge data is kept: an hour, or minutes where the data will change soon with nothing to expire its tag
 * (see `readsSoon`). A visitor's refresh of the entity expires its tag, the one its pages use, at once.
 */
export function keepFor(facts: EntityFacts | null): void {
  if (facts && readsSoon(facts)) {
    cacheLife('minutes');
  } else {
    cacheLife('hours');
  }
}

/** A repository's badge data (see `keepFor`); `null` when the repository is unknown. */
export async function loadBadgeRepo(owner: string, name: string): Promise<RepoFacts | null> {
  'use cache';
  cacheTag(getRepoCacheTag(owner, name));
  const facts = toRepoFacts(await graphqlDirect(BadgeRepoDocument, { owner, name }, { source: 'badge' }));
  keepFor(facts);
  return facts;
}

/** A developer's badge data (see `keepFor`); `null` when the profile is unknown. */
export async function loadBadgeUser(login: string): Promise<UserFacts | null> {
  'use cache';
  cacheTag(profileCacheTag(login));
  const facts = toUserFacts(await graphqlDirect(BadgeUserDocument, { login }, { source: 'badge' }));
  keepFor(facts);
  return facts;
}

/** An organization's badge data, kept for an hour; `null` when the organization is unknown. */
export async function loadBadgeOrg(login: string): Promise<OrgFacts | null> {
  'use cache';
  cacheTag(`org:${login}`);
  cacheLife('hours');
  return toOrgFacts(await graphqlDirect(BadgeOrgDocument, { login }, { source: 'badge' }), login);
}

/** A developer's Badges card data (see `card-facts.ts` and `keepFor`); `null` when the profile is unknown. */
export async function loadBadgeUserCard(login: string): Promise<UserFacts | null> {
  'use cache';
  cacheTag(profileCacheTag(login));
  const facts = toUserCardFacts(await graphqlDirect(BadgeUserCardDocument, { login }, { source: 'badge' }));
  keepFor(facts);
  return facts;
}

/** A repository's Badges card data (see `keepFor`); `null` when the repository is unknown. */
export async function loadBadgeRepoCard(owner: string, name: string): Promise<RepoFacts | null> {
  'use cache';
  cacheTag(getRepoCacheTag(owner, name));
  const facts = toRepoCardFacts(await graphqlDirect(BadgeRepoCardDocument, { owner, name }, { source: 'badge' }));
  keepFor(facts);
  return facts;
}

/** An organization's Badges card data (see `keepFor`); `null` when the organization is unknown. */
export async function loadBadgeOrgCard(login: string): Promise<OrgFacts | null> {
  'use cache';
  cacheTag(`org:${login}`);
  const facts = toOrgCardFacts(await graphqlDirect(BadgeOrgCardDocument, { login }, { source: 'badge' }), login);
  keepFor(facts);
  return facts;
}

/**
 * An npm package's badge facts; `null` for a name the registry does not have, and for one GitRanks has not read yet
 * (it has no badges until then, not even "new").
 */
export function toPackageFacts({ package: pkg }: BadgePackageQuery): PackageFacts | null {
  if (pkg?.state !== 'READ') return null;
  const downloads = pkg.downloads;
  return {
    kind: 'package',
    registry: 'npm',
    name: pkg.name,
    repo: pkg.repo ? { nameWithOwner: pkg.repo.nameWithOwner, stars: pkg.repo.stars } : null,
    repositoryName: pkg.repo ? null : (pkg.repositoryName ?? null),
    dependentsCount: pkg.dependentsCount,
    dependentsStars: pkg.dependentsStars,
    dependents: (pkg.dependents?.items ?? []).map(({ nameWithOwner, ownerAvatarUrl, stars, archived }) => ({
      nameWithOwner,
      ownerAvatarUrl: ownerAvatarUrl || null,
      stars,
      archived,
    })),
    downloads: downloads
      ? {
          through: String(downloads.through),
          lastWeek: downloads.lastWeek,
          previousWeek: downloads.previousWeek,
          last52Weeks: downloads.last52Weeks,
          previous52Weeks: downloads.previous52Weeks ?? null,
          perStar: downloads.perStar ?? null,
          weeks: (downloads.weeks ?? []).map(({ start, downloads: count }) => ({
            start: String(start),
            downloads: count,
          })),
        }
      : null,
  };
}

/** The API's error code for package data it cannot read just now: never an answer that there is none. */
const PACKAGES_UNAVAILABLE_CODE = 'PACKAGES_UNAVAILABLE';

const UNAVAILABLE = 'unavailable';
type Unavailable = typeof UNAVAILABLE;

/** Whether a failed read is that error: the request helper throws the API's errors as their JSON. */
const isPackagesUnavailable = (error: unknown) =>
  error instanceof Error && error.message.includes(`"code":"${PACKAGES_UNAVAILABLE_CODE}"`);

/**
 * `next build` renders one package's page ahead of time; it asks the API nothing about packages, and that render is
 * kept for minutes like any other render without package data.
 */
const isBuild = () => process.env.NEXT_PHASE === 'phase-production-build';

/**
 * A package's badge facts by its exact name, kept for an hour under the package's tag, which a refresh of it expires.
 * A name GitRanks has not read yet is kept for minutes, so its first read shows soon; so is "unavailable", the API's
 * answer while it cannot read package data.
 */
async function readBadgePackage(name: string): Promise<PackageFacts | null | Unavailable> {
  'use cache';
  cacheTag(packageCacheTag(name));
  if (isBuild()) {
    cacheLife('minutes');
    return UNAVAILABLE;
  }
  try {
    const data = await graphqlDirect(
      BadgePackageDocument,
      { registry: 'NPM', name, limit: BADGE_DEPENDENTS },
      { source: 'badge' },
    );
    if (data?.package && data.package.state !== 'READ') {
      cacheLife('minutes');
    } else {
      cacheLife('hours');
    }
    return toPackageFacts(data ?? {});
  } catch (error) {
    if (!isPackagesUnavailable(error)) throw error;
    cacheLife('minutes');
    return UNAVAILABLE;
  }
}

/** A package's badge data for its images and the builder; throws while package data cannot be read (a 503). */
export async function loadBadgePackage(name: string): Promise<PackageFacts | null> {
  const facts = await readBadgePackage(name);
  if (facts === UNAVAILABLE) {
    throw new Error('Package data is not available right now');
  }
  return facts;
}

/** A package's Badges card data; `null`, and no card, while package data cannot be read. */
export async function loadBadgePackageCard(name: string): Promise<PackageFacts | null> {
  const facts = await readBadgePackage(name);
  return facts === UNAVAILABLE ? null : facts;
}
