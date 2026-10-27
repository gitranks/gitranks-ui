import { CONTRIBUTOR_KEYS, DEFAULT_CONTRIBUTOR_EXTRA, ORG_CONTRIBUTOR_KEYS } from './contributors';
import { type EntityFacts, type OrgFacts, type RepoFacts, type UserFacts, wallOf } from './facts';
import type { BadgeParams } from './params';
import { repoRace, userClimbRace, userStarsRace } from './race';
import type { BadgeFormat, By, ContributorKey, EntityKind } from './types';
import { isRankedIn } from '@/badge/utils/is-ranked-in';
import { UserRankProp } from '@/types/ranking.types';

/** Extras a shield can show after its value (spec §3.1); contributor keys for the contributors shield. */
export type ExtraKey =
  | 'top'
  | 'month'
  | 'goal'
  | 'of'
  | 'togo'
  | 'race'
  | 'count'
  | 'shared'
  | 'repos'
  | 'rank'
  | 'stars'
  | 'level'
  | ContributorKey;

/** Query parameters a badge reads besides the scheme, the logo and the label. */
export type BadgeOption = 'by' | 'scope' | 'language' | 'value' | 'order' | 'rows' | 'tiers' | 'size';

export type BadgeDefinition = {
  id: string;
  entity: EntityKind;
  format: BadgeFormat;
  /** Names the badge where it has no value to show ("not yet") and in alt text. */
  title: string;
  /** Allowed extras; "none" is always allowed. */
  extras: readonly ExtraKey[];
  /** The extra shown by default; left out silently when the entity has nothing to show for it. */
  defaultExtra: ExtraKey | null;
  /** The contributor keys the value can be (contributors shields). */
  values?: readonly ContributorKey[];
  options: readonly BadgeOption[];
  /** A fixed drawing size for cards and charts; walls grow with their rows. */
  size?: { width: number; height: number };
};

const shield = (
  entity: EntityKind,
  id: string,
  title: string,
  extras: readonly ExtraKey[],
  defaultExtra: ExtraKey | null,
  options: readonly BadgeOption[] = [],
  values?: readonly ContributorKey[],
): BadgeDefinition => ({ id, entity, format: 'shield', title, extras, defaultExtra, options, values });

const panel = (
  entity: EntityKind,
  id: string,
  format: 'card' | 'chart',
  title: string,
  size: { width: number; height: number } | undefined,
  options: readonly BadgeOption[] = [],
): BadgeDefinition => ({
  id,
  entity,
  format,
  title,
  extras: [],
  defaultExtra: null,
  options: format === 'card' ? [...options, 'size'] : options,
  size,
});

const WALL_OPTIONS = ['order', 'rows', 'tiers'] as const;

/** Every v3 badge: shields, cards and charts per entity (spec §3.1, §3.2). */
export const CATALOGUE = [
  // Repositories
  shield('repo', 'rank', 'repo rank', ['top', 'month', 'goal'], 'top'),
  shield('repo', 'language-rank', 'language rank', ['of', 'top', 'month'], 'of', ['language']),
  shield('repo', 'goal', 'next goal', ['togo'], 'togo'),
  shield('repo', 'stars', 'stars', ['month', 'race'], 'month'),
  shield('repo', 'month', 'this month', ['race'], 'race'),
  shield('repo', 'starred-by', 'starred by', ['count'], 'count'),
  shield(
    'repo',
    'contributors',
    'contributors',
    CONTRIBUTOR_KEYS,
    DEFAULT_CONTRIBUTOR_EXTRA,
    ['value'],
    CONTRIBUTOR_KEYS,
  ),
  shield('repo', 'sibling', 'sibling repo', ['shared'], null),
  shield('repo', 'tier', 'gitranks', ['level'], null),
  panel('repo', 'rank-card', 'card', 'rank', { width: 400, height: 120 }),
  panel('repo', 'stars-card', 'card', 'stars', { width: 400, height: 120 }),
  panel('repo', 'starred-by-card', 'card', 'starred by top developers', { width: 400, height: 140 }),
  panel('repo', 'community-card', 'card', 'community', { width: 400, height: 140 }),
  panel('repo', 'tier-card', 'card', 'tier', { width: 400, height: 120 }),
  panel('repo', 'star-history', 'chart', 'star history', { width: 1000, height: 400 }),
  panel('repo', 'contributors-chart', 'chart', 'active contributors per month', { width: 800, height: 300 }),
  panel('repo', 'contributors-wall', 'chart', 'contributors', undefined, WALL_OPTIONS),
  // Developers
  shield('user', 'rank', 'stars rank', ['top', 'month', 'goal'], 'top', ['by', 'scope']),
  shield('user', 'language-rank', 'language rank', ['of', 'top', 'month'], 'of', ['language']),
  shield('user', 'goal', 'next goal', ['togo'], 'togo', ['by', 'scope']),
  shield('user', 'month', 'this month', ['race'], 'race'),
  shield('user', 'climb', 'this month', ['race', 'rank'], null),
  shield('user', 'tier', 'gitranks', ['level'], null, ['by', 'scope']),
  panel('user', 'profile-card', 'card', 'profile', { width: 400, height: 140 }),
  panel('user', 'count-chart', 'chart', 'last 24 months', { width: 800, height: 300 }, ['by']),
  panel('user', 'contributors-wall', 'chart', 'contributors', undefined, WALL_OPTIONS),
  // Organizations
  shield('org', 'rank', 'org rank', ['top', 'month'], 'top'),
  shield('org', 'stars', 'stars', ['repos'], 'repos'),
  shield('org', 'top-repo', 'top repo', ['rank', 'stars'], 'rank'),
  shield('org', 'popular-repos', '1k+ ★ repos', [], null),
  shield(
    'org',
    'contributors',
    'contributors',
    ORG_CONTRIBUTOR_KEYS,
    DEFAULT_CONTRIBUTOR_EXTRA,
    ['value'],
    ORG_CONTRIBUTOR_KEYS,
  ),
  panel('org', 'org-card', 'card', 'organization', { width: 400, height: 160 }),
  panel('org', 'contributors-chart', 'chart', 'active contributors per month', { width: 800, height: 300 }),
  panel('org', 'contributors-wall', 'chart', 'contributors', undefined, WALL_OPTIONS),
] as const satisfies readonly BadgeDefinition[];

export function findBadge(entity: EntityKind, id: string): BadgeDefinition | null {
  return CATALOGUE.find((badge) => badge.entity === entity && badge.id === id) ?? null;
}

export const badgesOf = (entity: EntityKind): BadgeDefinition[] => CATALOGUE.filter((badge) => badge.entity === entity);

/**
 * Where a badge stands for an entity:
 * - `available`: it has its fact; the builder offers it and pages may promote it;
 * - `neutral`: it applies to the entity but has nothing to show right now (a volatile badge, spec §5.4); its URL
 *   draws a neutral value and the builder hides it;
 * - `never`: it has never applied to the entity; its URL draws "not yet".
 */
export type Availability = 'available' | 'neutral' | 'never';

const BY_PROP: Record<By, UserRankProp> = {
  stars: UserRankProp.s,
  contributions: UserRankProp.c,
  followers: UserRankProp.f,
};

export const rankPropOf = (by: By) => BY_PROP[by];

/** A wall needs this many people. */
export const WALL_MIN_PEOPLE = 3;
/** The contributors shield needs this many people active in 12 months. */
export const CONTRIBUTORS_MIN_ACTIVE = 3;

const either = (has: boolean, applies: boolean): Availability => (has ? 'available' : applies ? 'neutral' : 'never');

/** The developer's ranks in the list a `scope` names; a country list needs a country. */
export function userRanksIn(user: UserFacts, scope: BadgeParams['scope']) {
  if (scope === 'country') {
    return user.country ? user.rankCountry : null;
  }
  return user.rankGlobal;
}

export function isUserRankedIn(user: UserFacts, by: By, scope: BadgeParams['scope']): boolean {
  const ranks = userRanksIn(user, scope);
  return !!ranks && isRankedIn(BY_PROP[by], { s: user.s, c: user.c, f: user.f }, ranks);
}

/** The developer's language entry a badge reads: the asked one, or their best ranked. */
export function userLanguageOf(user: UserFacts, language: string | null) {
  const ranked = user.languages.filter(({ rank }) => !!rank);
  if (!language) {
    return ranked.toSorted((a, b) => (a.rank ?? 0) - (b.rank ?? 0))[0] ?? null;
  }
  return ranked.find(({ name }) => name.toLowerCase() === language.toLowerCase()) ?? null;
}

/** A repository is in one language list, its own. */
export function repoLanguageOf(repo: RepoFacts, language: string | null): string | null {
  const own = repo.rank?.l ? repo.rank.language : null;
  if (!own) return null;
  return !language || language.toLowerCase() === own.toLowerCase() ? own : null;
}

/** The monthly points of a developer's count in one ranking, oldest first. */
export function countSeries(user: UserFacts, by: By): [key: string, value: number][] {
  const prop = BY_PROP[by];
  return Object.entries(user.snapshots ?? {})
    .filter(([key]) => /^\d{4}-\d{2}-01$/.test(key))
    .flatMap(([key, value]): [string, number][] => {
      const count = value?.[prop];
      return typeof count === 'number' ? [[key, count]] : [];
    })
    .sort(([a], [b]) => a.localeCompare(b));
}

/** A count chart needs this many monthly points. */
export const COUNT_CHART_MIN_POINTS = 3;

/**
 * The developer wall stays hidden until contributor analytics cover developers' own repositories; its drawing is
 * kept for then.
 */
export const USER_WALL_OFFERED = false;

function repoAvailability(repo: RepoFacts, id: string, params: BadgeParams, now: Date): Availability {
  const ranked = !!repo.rank?.s;
  switch (id) {
    case 'rank':
    case 'stars':
    case 'rank-card':
      return either(ranked, false);
    case 'language-rank':
      return either(!!repoLanguageOf(repo, params.language), false);
    case 'goal':
      return either(ranked && !!repo.rankGoal, ranked);
    case 'month':
      return either(repoRace(repo, now).state.kind !== 'hidden', true);
    case 'starred-by':
      return either(!!repo.starsBest?.top.some(({ login }) => !!login), (repo.starsBest?.total ?? 0) >= 1);
    case 'contributors':
      return either((repo.pulse?.active12 ?? 0) >= CONTRIBUTORS_MIN_ACTIVE, !!repo.pulse);
    case 'sibling':
      return either(!!repo.siblings?.length, !!repo.siblings);
    case 'tier':
    case 'tier-card':
      return either(ranked && !!repo.rank?.tier, false);
    case 'stars-card':
      return either(!!repo.history, false);
    case 'starred-by-card':
      return either((repo.starsBest?.total ?? 0) >= 1, false);
    case 'community-card':
      return either(!!repo.pulse, false);
    case 'contributors-chart':
      return either(!!repo.pulse && !!repo.pulseSeries?.months.length, false);
    case 'star-history':
      return 'available';
    case 'contributors-wall':
      return either(!!repo.pulse && (wallOf(repo, params.order)?.entries.length ?? 0) >= WALL_MIN_PEOPLE, false);
    default:
      return 'never';
  }
}

function userAvailability(user: UserFacts, id: string, params: BadgeParams, now: Date): Availability {
  const rankedIn = isUserRankedIn(user, params.by, params.scope);
  switch (id) {
    case 'rank':
      return either(rankedIn, false);
    case 'tier': {
      const lists = params.scope === 'country' ? user.tiersCountry : user.tiersGlobal;
      return either(rankedIn && !!lists?.tiers[BY_PROP[params.by]].length, false);
    }
    case 'language-rank':
      return either(!!userLanguageOf(user, params.language), false);
    case 'goal':
      return either(rankedIn && !!user.rankGoal?.[BY_PROP[params.by]], rankedIn);
    case 'month':
      return either(userStarsRace(user, now).state.kind !== 'hidden', true);
    case 'climb':
      return either((userClimbRace(user, now).current ?? 0) > 0, isUserRankedIn(user, 'stars', 'global'));
    case 'profile-card':
      return either(isUserRankedIn(user, 'stars', 'global') || isUserRankedIn(user, 'contributions', 'global'), false);
    case 'count-chart':
      return either(countSeries(user, params.by).length >= COUNT_CHART_MIN_POINTS, false);
    case 'contributors-wall':
      return either(USER_WALL_OFFERED && (wallOf(user, params.order)?.entries.length ?? 0) >= WALL_MIN_PEOPLE, false);
    default:
      return 'never';
  }
}

function orgAvailability(org: OrgFacts, id: string, params: BadgeParams): Availability {
  const ranked = !!org.rank?.s;
  switch (id) {
    case 'rank':
    case 'stars':
    case 'org-card':
      return either(ranked, false);
    case 'top-repo':
      return either(!!org.topRepos[0]?.rank, ranked);
    case 'popular-repos':
      return either(org.reposOver1k >= 1, false);
    case 'contributors':
      return either((org.pulse?.active12 ?? 0) >= CONTRIBUTORS_MIN_ACTIVE, !!org.pulse);
    case 'contributors-chart':
      return either(!!org.pulse && !!org.pulseSeries?.months.length, false);
    case 'contributors-wall':
      return either(!!org.pulse && (wallOf(org, params.order)?.entries.length ?? 0) >= WALL_MIN_PEOPLE, false);
    default:
      return 'never';
  }
}

export function availabilityOf(entity: EntityFacts, id: string, params: BadgeParams, now = new Date()): Availability {
  switch (entity.kind) {
    case 'repo':
      return repoAvailability(entity, id, params, now);
    case 'user':
      return userAvailability(entity, id, params, now);
    case 'org':
      return orgAvailability(entity, id, params);
  }
}

/** The badges the builder offers an entity with their default options, in catalogue order. */
export function availableBadges(entity: EntityFacts, params: BadgeParams, now = new Date()): BadgeDefinition[] {
  return badgesOf(entity.kind).filter((badge) => availabilityOf(entity, badge.id, params, now) === 'available');
}
