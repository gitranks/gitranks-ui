import {
  type BadgeDefinition,
  isUserRankedIn,
  rankPropOf,
  repoLanguageOf,
  userLanguageOf,
  userRanksIn,
} from './catalogue';
import { contributorSegment } from './contributors';
import type { OrgFacts, RankGoal, RepoFacts, UserFacts } from './facts';
import { formatCompact, formatFull, mono, rankMoveSegment, rankSegment, segment, text, topShare } from './format';
import { goalAmount, goalText } from './goals';
import type { BadgeParams } from './params';
import { type RaceState, repoRace, userClimbRace, userStarsRace } from './race';
import type { By, Segment, ShieldContent } from './types';
import { REPO_TIER_NAMES, TIER_NAMES } from '@/app/app.consts';
import { getRankingTierData } from '@/utils/calculate-tiers/calculate-tiers';

/** The neutral value of a badge with nothing to show right now. */
const DASH = segment(text('–'));

const RANK_LABEL: Record<By, string> = {
  stars: 'stars rank',
  contributions: 'contrib rank',
  followers: 'followers rank',
};

const textSegment = (value: string) => segment(text(value));

/** "level 3 of 5". */
const levelSegment = (level: number, levels: number) => textSegment(`level ${level} of ${levels}`);

/** "+38 ★" in the positive colour; "+0 ★" when nothing was gained. */
const gainSegment = (gain: number | null) =>
  gain === null ? DASH : gain > 0 ? segment(mono(`+${formatFull(gain)} ★`, 'positive')) : segment(mono('+0 ★'));

/** "10 to beat Sep" behind, "beat Sep ↑" ahead; nothing in the other states. */
function raceSegment(state: RaceState, lastName: string): Segment | null {
  if (state.kind === 'behind') {
    return segment(mono(formatFull(state.toBeat)), text(` to beat ${lastName}`));
  }
  if (state.kind === 'beaten') {
    return segment(text(`beat ${lastName} ↑`, 'positive'));
  }
  return null;
}

/** Shows the extra the params ask for; `null` (the extra is left out) when the entity has nothing for it. */
type Extras = Partial<Record<string, () => Segment | null>>;

function pickExtra(params: BadgeParams, extras: Extras): Segment | undefined {
  return (params.extra && extras[params.extra]?.()) || undefined;
}

function content(params: BadgeParams, label: string, value: Segment, extras: Extras = {}) {
  return { label: params.label ?? label, value, extra: pickExtra(params, extras) } satisfies ShieldContent;
}

function goalExtra(goal: RankGoal | null | undefined, entity: 'repo' | 'user'): Segment | null {
  return goal ? textSegment(`${goalAmount(goal)} to ${goalText(goal, entity)}`) : null;
}

function repoShield(repo: RepoFacts, badge: BadgeDefinition, params: BadgeParams, now: Date): ShieldContent | null {
  const rank = repo.rank;
  switch (badge.id) {
    case 'rank': {
      if (!rank?.s) return null;
      return content(params, 'repo rank', rankSegment(rank.s), {
        top: () => nullable(topShare(rank.s, repo.totals.repos)),
        month: () => rankMoveSegment(rank.s, rank.sM),
        goal: () => goalExtra(repo.rankGoal, 'repo'),
      });
    }
    case 'language-rank': {
      const language = repoLanguageOf(repo, params.language);
      if (!language || !rank?.l) return null;
      return content(params, `${language} rank`, rankSegment(rank.l), {
        of: () => (repo.totals.languageRepos ? textSegment(`of ${formatFull(repo.totals.languageRepos)}`) : null),
        top: () => nullable(topShare(rank.l, repo.totals.languageRepos)),
        month: () => rankMoveSegment(rank.l, rank.lM),
      });
    }
    case 'goal': {
      if (!rank?.s) return null;
      const goal = repo.rankGoal;
      // No goal left: the plain rank, never "not yet".
      if (!goal) return content({ ...params, extra: null }, 'repo rank', rankSegment(rank.s));
      return content(params, 'next goal', textSegment(goalText(goal, 'repo')), {
        togo: () => textSegment(`${goalAmount(goal)} to go`),
      });
    }
    case 'stars': {
      if (!rank?.s) return null;
      const race = repoRace(repo, now);
      return content(params, 'stars', segment(mono(formatFull(repo.stars))), {
        month: () =>
          (repo.gainedThisMonth ?? 0) > 0
            ? segment(text(`+${formatFull(repo.gainedThisMonth ?? 0)} this month`, 'positive'))
            : null,
        race: () => raceSegment(race.state, race.lastName),
      });
    }
    case 'month':
      return monthShield(params, repoRace(repo, now));
    case 'starred-by': {
      const best = repo.starsBest;
      if (!best || best.total < 1) return null;
      const named = best.top.find(({ login }) => !!login);
      if (!named?.login) {
        return content({ ...params, extra: null }, 'starred by', topDevsSegment(best.total));
      }
      return content(params, 'starred by', textSegment(named.login), {
        count: () => (best.total > 1 ? textSegment(`+${formatFull(best.total - 1)} top devs`) : null),
      });
    }
    case 'contributors':
      return contributorsShield(repo, params);
    case 'sibling': {
      if (!repo.siblings) return null;
      const sibling = repo.siblings[0];
      if (!sibling) return content({ ...params, extra: null }, 'sibling repo', DASH);
      return content(params, 'sibling repo', textSegment(sibling.nameWithOwner), {
        shared: () => textSegment(`${Math.round(sibling.share * 100)}% shared`),
      });
    }
    case 'tier': {
      const tier = rank?.s ? rank.tier : null;
      if (!tier) return null;
      return content(
        params,
        'gitranks',
        {
          icon: { kind: 'repo-tier', tier: tier.tier },
          tone: { tier: tier.tier },
          runs: [text(REPO_TIER_NAMES[tier.tier - 1])],
        },
        { level: () => levelSegment(tier.level, repo.tierLevels[tier.tier] ?? 5) },
      );
    }
    default:
      return null;
  }
}

const nullable = (value: string | null) => (value ? textSegment(value) : null);

const topDevsSegment = (count: number) =>
  segment(mono(formatFull(count)), text(count === 1 ? ' top dev' : ' top devs'));

function monthShield(
  params: BadgeParams,
  race: { current: number | null; lastName: string; state: RaceState },
): ShieldContent {
  const { state } = race;
  if (state.kind === 'hidden') {
    // On the 1st, or after unstars: a neutral "+0 ★".
    return content({ ...params, extra: null }, 'this month', gainSegment(race.current === null ? null : 0));
  }
  if (state.kind === 'record' && params.extra !== null) {
    return content(
      { ...params, extra: null },
      'record month',
      segment(mono(`+${formatFull(race.current ?? 0)} ★`, 'gold')),
    );
  }
  return content(params, 'this month', gainSegment(race.current), {
    race: () => raceSegment(state, race.lastName),
  });
}

function contributorsShield(entity: RepoFacts | OrgFacts, params: BadgeParams): ShieldContent | null {
  if (!entity.pulse) return null;
  const value = contributorSegment(entity, params.value) ?? DASH;
  return content(params, 'contributors', value, {
    [params.extra ?? '']: () => (params.extra ? contributorSegment(entity, params.extra as typeof params.value) : null),
  });
}

/** The value of a rank: "#1,204", or "#2 in Ukraine" for a country list. */
function userRankSegment(user: UserFacts, rank: number, scope: BadgeParams['scope']): Segment {
  return scope === 'country' && user.country
    ? segment(mono(`#${formatFull(rank)}`), text(` in ${user.country}`))
    : rankSegment(rank);
}

function userRankOf(user: UserFacts, by: By, scope: BadgeParams['scope']) {
  const ranks = userRanksIn(user, scope);
  const prop = rankPropOf(by);
  const rank = ranks?.[prop] ?? ranks?.[`${prop}Provisional`] ?? null;
  return { rank, startRank: ranks?.[`${prop}M`] ?? null, prop };
}

function userShield(user: UserFacts, badge: BadgeDefinition, params: BadgeParams, now: Date): ShieldContent | null {
  const { by, scope } = params;
  switch (badge.id) {
    case 'rank': {
      if (!isUserRankedIn(user, by, scope)) return null;
      const { rank, startRank, prop } = userRankOf(user, by, scope);
      if (!rank) return null;
      const lists = scope === 'country' ? user.tiersCountry : user.tiersGlobal;
      return content(params, RANK_LABEL[by], userRankSegment(user, rank, scope), {
        top: () => nullable(topShare(rank, lists?.users[prop])),
        month: () => rankMoveSegment(rank, startRank),
        goal: () => goalExtra(user.rankGoal?.[prop], 'user'),
      });
    }
    case 'language-rank': {
      const language = userLanguageOf(user, params.language);
      if (!language?.rank) return null;
      const { rank, rankM, total } = language;
      return content(params, `${language.name} rank`, rankSegment(rank), {
        of: () => (total ? textSegment(`of ${formatFull(total)}`) : null),
        top: () => nullable(topShare(rank, total)),
        month: () => rankMoveSegment(rank, rankM),
      });
    }
    case 'goal': {
      if (!isUserRankedIn(user, by, scope)) return null;
      const { rank, prop } = userRankOf(user, by, scope);
      const goal = user.rankGoal?.[prop];
      if (!goal) {
        return rank ? content({ ...params, extra: null }, RANK_LABEL[by], userRankSegment(user, rank, scope)) : null;
      }
      return content(params, 'next goal', textSegment(goalText(goal, 'user')), {
        togo: () => textSegment(`${goalAmount(goal)} to go`),
      });
    }
    case 'month':
      return monthShield(params, userStarsRace(user, now));
    case 'climb': {
      if (!isUserRankedIn(user, 'stars', 'global')) return null;
      const race = userClimbRace(user, now);
      if (race.state.kind === 'hidden' || !race.current) {
        return content({ ...params, extra: null }, 'this month', DASH);
      }
      const places = race.current === 1 ? 'place' : 'places';
      return content(
        params,
        'this month',
        segment(mono(`↑${formatFull(race.current)}`, 'positive'), text(` ${places}`, 'positive')),
        {
          race: () => raceSegment(race.state, race.lastName),
          rank: () => (race.rank ? segment(mono(`#${formatFull(race.rank)}`), text(' now')) : null),
        },
      );
    }
    case 'tier': {
      const tier = userTierOf(user, by, scope);
      if (!tier) return null;
      return content(
        params,
        'gitranks',
        {
          icon: { kind: 'user-tier', tier: tier.tier },
          tone: { tier: tier.tier },
          runs: [text(TIER_NAMES[tier.tier - 1])],
        },
        { level: () => levelSegment(tier.level, tier.levels) },
      );
    }
    default:
      return null;
  }
}

/** The developer's tier in a list, with how many levels that tier has. */
export function userTierOf(user: UserFacts, by: By, scope: BadgeParams['scope']) {
  if (!isUserRankedIn(user, by, scope)) return null;
  const lists = scope === 'country' ? user.tiersCountry : user.tiersGlobal;
  const prop = rankPropOf(by);
  const table = lists?.tiers[prop];
  if (!lists || !table?.length) return null;
  const data = getRankingTierData(prop, userRanksIn(user, scope), lists.users[prop], table).data;
  if (!data) return null;
  return { tier: data.tier, level: data.level, levels: table.filter(({ tier }) => tier === data.tier).length || 5 };
}

function orgShield(org: OrgFacts, badge: BadgeDefinition, params: BadgeParams): ShieldContent | null {
  const rank = org.rank;
  switch (badge.id) {
    case 'rank':
      if (!rank?.s) return null;
      return content(params, 'org rank', rankSegment(rank.s), {
        top: () => nullable(topShare(rank.s, org.orgRankTotal)),
        month: () => rankMoveSegment(rank.s, rank.sM),
      });
    case 'stars':
      if (!rank?.s) return null;
      return content(params, 'stars', segment(mono(formatCompact(org.s ?? 0))), {
        repos: () =>
          org.reposCount
            ? segment(mono(formatFull(org.reposCount)), text(org.reposCount === 1 ? ' repo' : ' repos'))
            : null,
      });
    case 'top-repo': {
      if (!rank?.s) return null;
      const top = org.topRepos[0];
      if (!top?.rank) return content({ ...params, extra: null }, 'top repo', DASH);
      return content(params, 'top repo', textSegment(top.nameWithOwner), {
        rank: () => (top.rank ? rankSegment(top.rank) : null),
        stars: () => segment(mono(`${formatCompact(top.stars)} ★`)),
      });
    }
    case 'popular-repos':
      return content(params, '1k+ ★ repos', segment(mono(formatFull(org.reposOver1k))));
    case 'contributors':
      return contributorsShield(org, params);
    default:
      return null;
  }
}

/**
 * What a shield says for an entity, or `null` when the badge has never applied to it ("not yet"). Volatile badges
 * with nothing to show keep their shape with a neutral value (spec §5.4).
 */
export function shieldContent(
  entity: RepoFacts | UserFacts | OrgFacts,
  badge: BadgeDefinition,
  params: BadgeParams,
  now = new Date(),
): ShieldContent | null {
  switch (entity.kind) {
    case 'repo':
      return repoShield(entity, badge, params, now);
    case 'user':
      return userShield(entity, badge, params, now);
    case 'org':
      return orgShield(entity, badge, params);
  }
}

/** The shield a badge draws where it has never applied: its label and "not yet". */
export function notYetShield(badge: BadgeDefinition, params: BadgeParams): ShieldContent {
  const label = badge.id === 'rank' && badge.entity === 'user' ? RANK_LABEL[params.by] : badge.title;
  return { label: params.label ?? label, value: textSegment('not yet') };
}
