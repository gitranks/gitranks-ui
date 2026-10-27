import type { EntityFacts, OrgFacts, PulseFacts, RepoFacts, UserFacts, UserRanks, UserTierLists } from './facts';
import type { BadgeOrgCardQuery, BadgeRepoCardQuery, BadgeUserCardQuery } from '@/types/generated/graphql';

/**
 * A page's Badges card reads a narrow document per entity: only the facts its promoted badges (spec §3.9) and their alt
 * texts need. It maps into the same facts the badge images read, with the parts no promoted badge reads left empty, so
 * the catalogue's rules decide availability alike. Pages never fetch walls, star history points, goals or tier tables.
 */

const asNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

function numberRecord(json: unknown): Record<string, number> | null {
  if (!json || typeof json !== 'object') return null;
  const entries = Object.entries(json as Record<string, unknown>)
    .map(([key, value]) => [key, asNumber(value)] as const)
    .filter((entry): entry is readonly [string, number] => entry[1] !== null);
  return Object.fromEntries(entries);
}

function scoreRecord(json: unknown): UserFacts['snapshots'] {
  if (!json || typeof json !== 'object') return null;
  return Object.fromEntries(
    Object.entries(json as Record<string, Record<string, unknown> | null>).map(([key, value]) => [
      key,
      { s: asNumber(value?.s), c: asNumber(value?.c), f: asNumber(value?.f) },
    ]),
  );
}

type Ranks = Partial<Record<keyof UserRanks, number | null>> | null | undefined;

const toRanks = (ranks: Ranks): UserRanks | null =>
  ranks
    ? {
        s: ranks.s ?? null,
        c: ranks.c ?? null,
        f: ranks.f ?? null,
        sM: ranks.sM ?? null,
        cM: ranks.cM ?? null,
        fM: ranks.fM ?? null,
        sProvisional: ranks.sProvisional ?? null,
        cProvisional: ranks.cProvisional ?? null,
        fProvisional: ranks.fProvisional ?? null,
      }
    : null;

type Totals = { sUsers: number; cUsers: number; fUsers: number } | null | undefined;

/** The list sizes alone: the card shows a top share, never a tier. */
const toTotals = (totals: Totals): UserTierLists | null =>
  totals ? { users: { s: totals.sUsers, c: totals.cUsers, f: totals.fUsers }, tiers: { s: [], c: [], f: [] } } : null;

type CardPulse = {
  lastMonth: string;
  last12: { activeContributors: number; newContributors: number };
  countryCount: number;
};

const toPulse = (pulse: CardPulse | null | undefined): PulseFacts | null =>
  pulse
    ? {
        lastMonth: pulse.lastMonth,
        active12: pulse.last12.activeContributors,
        new12: pulse.last12.newContributors,
        countryCount: pulse.countryCount,
        // Read only by a five-year contributors value, which no page promotes.
        contributors60: 0,
      }
    : null;

export function toUserCardFacts({ user }: BadgeUserCardQuery): UserFacts | null {
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
    rankSnapshots: null,
    tiersGlobal: toTotals(user.tiersGlobal),
    tiersCountry: toTotals(user.tiersCountry),
    languages: [],
    rankGoal: { s: null, c: null, f: null },
    contributorsWall: {},
    wallRepos: null,
  };
}

export function toRepoCardFacts({ repo, repoRankTiers, repoLanguages }: BadgeRepoCardQuery): RepoFacts | null {
  if (!repo) return null;
  const rank = repo.rank;
  const language = rank?.language ?? repo.language ?? null;
  return {
    kind: 'repo',
    nameWithOwner: repo.nameWithOwner,
    language: repo.language ?? null,
    stars: repo.stars,
    gainedThisMonth: repo.gainedThisMonth ?? null,
    monthStarts: numberRecord(repo.monthStarts),
    // Whether a history exists, without its points: no promoted badge's availability or alt text needs them.
    history: repo.history
      ? {
          points: [],
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
          tier: null,
        }
      : null,
    totals: {
      repos: repoRankTiers?.repos ?? null,
      languageRepos: language ? (repoLanguages.find((entry) => entry.language === language)?.repos ?? null) : null,
    },
    tierLevels: {},
    starsBest: repo.starsBest ? { total: repo.starsBest.total, counts: [], top: [] } : null,
    siblings: null,
    builtBy: null,
    pulse: toPulse(repo.pulse),
    pulseSeries: null,
    rankGoal: null,
    contributorsWall: {},
  };
}

export function toOrgCardFacts({ organization: org, orgRankTotal }: BadgeOrgCardQuery, login: string): OrgFacts | null {
  if (!org) return null;
  return {
    kind: 'org',
    login: org.login ?? login,
    avatarUrl: org.avatarUrl ?? null,
    s: org.s ?? null,
    reposCount: org.reposCount ?? null,
    // Read only by the 1k+ ★ repos shield, which no page promotes.
    reposOver1k: 0,
    orgRankTotal: orgRankTotal || null,
    rank: org.rankOrg ? { s: org.rankOrg.s ?? null, sM: org.rankOrg.sM ?? null } : null,
    topRepos: org.topRepos.map(({ nameWithOwner, stars, rank }) => ({ nameWithOwner, stars, rank: rank?.s ?? null })),
    pulse: toPulse(org.pulse),
    // The months alone: the contributors chart is available when they exist.
    pulseSeries: org.pulseSeries
      ? { months: org.pulseSeries.months, activeLinked: [], activeAnonymous: [], newContributors: [] }
      : null,
    contributorsWall: {},
  };
}

/**
 * A page's read of its entity's badge data, for its Badges card: `null` facts for no entity, and `ok: false` when the
 * read failed, so the page renders without the card and is kept only briefly.
 */
export async function readBadgeFacts<T extends EntityFacts>(
  read: Promise<T | null> | null,
): Promise<{ facts: T | null; ok: boolean }> {
  try {
    return { facts: (await read) ?? null, ok: true };
  } catch (error) {
    console.error('Error reading badge data for a page:', error);
    return { facts: null, ok: false };
  }
}
