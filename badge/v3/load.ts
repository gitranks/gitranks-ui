import { cacheLife, cacheTag } from 'next/cache';

import type { OrgFacts, RepoFacts, TierTable, UserFacts, UserRanks, UserTierLists } from './facts';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import {
  BadgeOrgDocument,
  type BadgeOrgQuery,
  BadgeRepoDocument,
  type BadgeRepoQuery,
  BadgeUserDocument,
  type BadgeUserQuery,
} from '@/types/generated/graphql';
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
    nameWithOwner: repo.nameWithOwner,
    language: repo.language ?? null,
    stars: repo.stars,
    gainedThisMonth: repo.gainedThisMonth ?? null,
    monthStarts: numberRecord(repo.monthStarts),
    history: repo.history
      ? {
          points: repo.history.points.map(({ date, stars }) => ({ date: String(date), stars })),
          current: { date: String(repo.history.current.date), stars: repo.history.current.stars },
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
    pulse: repo.pulse
      ? {
          lastMonth: repo.pulse.lastMonth,
          active12: repo.pulse.last12.activeContributors,
          new12: repo.pulse.last12.newContributors,
        }
      : null,
    pulseSeries: repo.pulseSeries
      ? {
          months: repo.pulseSeries.months,
          activeLinked: repo.pulseSeries.activeLinked,
          activeAnonymous: repo.pulseSeries.activeAnonymous,
          newContributors: repo.pulseSeries.newContributors ?? [],
        }
      : null,
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
  };
}

export function toOrgFacts({ organization: org }: BadgeOrgQuery, login: string): OrgFacts | null {
  if (!org) return null;
  return {
    kind: 'org',
    login: org.login ?? login,
    avatarUrl: org.avatarUrl ?? null,
    s: org.s ?? null,
    reposCount: org.reposCount ?? null,
    rank: org.rankOrg ? { s: org.rankOrg.s ?? null, sM: org.rankOrg.sM ?? null } : null,
    topRepos: org.topRepos.map(({ nameWithOwner, stars, rank }) => ({ nameWithOwner, stars, rank: rank?.s ?? null })),
    pulse: org.pulse
      ? {
          lastMonth: org.pulse.lastMonth,
          active12: org.pulse.last12.activeContributors,
          new12: org.pulse.last12.newContributors,
        }
      : null,
    pulseSeries: org.pulseSeries
      ? {
          months: org.pulseSeries.months,
          activeLinked: org.pulseSeries.activeLinked,
          activeAnonymous: org.pulseSeries.activeAnonymous,
          newContributors: org.pulseSeries.newContributors ?? [],
        }
      : null,
  };
}

/** A repository's badge data, kept for an hour; `null` when the repository is unknown. */
export async function loadBadgeRepo(owner: string, name: string): Promise<RepoFacts | null> {
  'use cache';
  cacheTag(getRepoCacheTag(owner, name));
  cacheLife('hours');
  return toRepoFacts(await graphqlDirect(BadgeRepoDocument, { owner, name }, { source: 'badge' }));
}

/** A developer's badge data, kept for an hour; `null` when the profile is unknown. */
export async function loadBadgeUser(login: string): Promise<UserFacts | null> {
  'use cache';
  cacheTag(`profile:${login}`);
  cacheLife('hours');
  return toUserFacts(await graphqlDirect(BadgeUserDocument, { login }, { source: 'badge' }));
}

/** An organization's badge data, kept for an hour; `null` when the organization is unknown. */
export async function loadBadgeOrg(login: string): Promise<OrgFacts | null> {
  'use cache';
  cacheTag(`org:${login}`);
  cacheLife('hours');
  return toOrgFacts(await graphqlDirect(BadgeOrgDocument, { login }, { source: 'badge' }), login);
}
