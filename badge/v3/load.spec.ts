import { describe, expect, it, vi } from 'vitest';

import { toOrgFacts, toRankGoal, toRepoFacts, toUserFacts } from './load';
import {
  type BadgeOrgQuery,
  type BadgeRepoQuery,
  type BadgeUserQuery,
  RankGoalScope,
  RankGoalUnit,
} from '@/types/generated/graphql';

// The mappers are pure; the client is never called here.
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect: vi.fn() }));

const wall = (logins: string[], total: number, repos?: number) => ({
  total,
  repos,
  entries: logins.map((login, index) => ({
    login,
    avatarUrl: index === 0 ? '' : `https://avatars.githubusercontent.com/${login}`,
    tier: index === 0 ? null : 7,
    level: index === 0 ? null : 2,
  })),
});

const pulse = {
  lastMonth: '2026-09',
  last12: { activeContributors: 186, newContributors: 41 },
  countryCount: 23,
  contributors60: 2_410,
};

describe('toRankGoal', () => {
  it('reads the API enums in lower case', () => {
    expect(
      toRankGoal({
        targetRank: 25,
        scope: RankGoalScope.Language,
        language: 'Rust',
        needed: 8,
        unit: RankGoalUnit.Stars,
      }),
    ).toEqual({ targetRank: 25, scope: 'language', language: 'Rust', country: null, needed: 8, unit: 'stars' });
    expect(
      toRankGoal({
        targetRank: 10,
        scope: RankGoalScope.Country,
        country: 'Ukraine',
        needed: 120,
        unit: RankGoalUnit.ContributionStars,
      }),
    ).toMatchObject({ scope: 'country', country: 'Ukraine', unit: 'contributionStars' });
    expect(
      toRankGoal({ targetRank: 1_000, scope: RankGoalScope.Global, needed: 40, unit: RankGoalUnit.Followers }),
    ).toMatchObject({
      scope: 'global',
      unit: 'followers',
    });
    expect(toRankGoal(null)).toBeNull();
  });
});

describe('toRepoFacts', () => {
  const data: BadgeRepoQuery = {
    repo: {
      nameWithOwner: 'nebula/ui',
      language: 'TypeScript',
      stars: 54_210,
      rank: null,
      pulse,
      rankGoal: { targetRank: 1_000, scope: RankGoalScope.Global, needed: 3_120, unit: RankGoalUnit.Stars },
      wallPopular: wall(['a', 'b', 'c'], 186),
      wallContributions: wall(['c', 'b', 'a'], 186),
      wallNewest: null,
    },
    repoRankTiers: null,
    repoLanguages: [],
  };

  it('maps the goal, the pulse counts and the walls by order', () => {
    const repo = toRepoFacts(data);
    expect(repo?.rankGoal).toEqual({
      targetRank: 1_000,
      scope: 'global',
      language: null,
      country: null,
      needed: 3_120,
      unit: 'stars',
    });
    expect(repo?.pulse).toEqual({
      lastMonth: '2026-09',
      active12: 186,
      new12: 41,
      countryCount: 23,
      contributors60: 2_410,
    });
    expect(repo?.contributorsWall.popular?.entries.map(({ login }) => login)).toEqual(['a', 'b', 'c']);
    expect(repo?.contributorsWall.contributions?.total).toBe(186);
    expect(repo?.contributorsWall.newest).toBeNull();
  });

  it('keeps an empty avatar or tier as absent', () => {
    const [first, second] = toRepoFacts(data)?.contributorsWall.popular?.entries ?? [];
    expect(first).toEqual({ login: 'a', avatarUrl: null, tier: null, level: null });
    expect(second).toEqual({ login: 'b', avatarUrl: 'https://avatars.githubusercontent.com/b', tier: 7, level: 2 });
  });

  it('has no goal and no walls when the API sends none', () => {
    const repo = toRepoFacts({
      ...data,
      repo: { ...data.repo!, rankGoal: null, pulse: null, wallPopular: null, wallContributions: null },
    });
    expect(repo?.rankGoal).toBeNull();
    expect(repo?.pulse).toBeNull();
    expect(repo?.contributorsWall).toEqual({ popular: null, contributions: null, newest: null });
  });
});

describe('toUserFacts', () => {
  const data: BadgeUserQuery = {
    user: {
      login: 'octo-dev',
      sLangs: [],
      goalStars: { targetRank: 10, scope: RankGoalScope.Global, needed: 5_210, unit: RankGoalUnit.Stars },
      goalContributions: null,
      goalFollowers: {
        targetRank: 100,
        scope: RankGoalScope.Country,
        country: 'Ukraine',
        needed: 40,
        unit: RankGoalUnit.Followers,
      },
      wallPopular: wall(['a', 'b', 'c'], 142, 9),
      wallContributions: wall(['c', 'b', 'a'], 142),
    },
  };

  it('keeps a goal per ranking', () => {
    const user = toUserFacts(data);
    expect(user?.rankGoal.s).toMatchObject({ targetRank: 10, scope: 'global', unit: 'stars' });
    expect(user?.rankGoal.c).toBeNull();
    expect(user?.rankGoal.f).toMatchObject({ scope: 'country', country: 'Ukraine', unit: 'followers' });
  });

  it('reads the wall and the repositories it spans; no newest order', () => {
    const user = toUserFacts(data);
    expect(user?.contributorsWall.popular?.total).toBe(142);
    expect(user?.contributorsWall.contributions?.entries).toHaveLength(3);
    expect(user?.contributorsWall.newest).toBeNull();
    expect(user?.wallRepos).toBe(9);
    expect(toUserFacts({ user: { ...data.user!, wallPopular: null } })?.wallRepos).toBeNull();
  });
});

describe('toOrgFacts', () => {
  const data: BadgeOrgQuery = {
    orgRankTotal: 336_901,
    organization: {
      login: 'nebula',
      reposOver1k: 14,
      topRepos: [],
      pulse,
      wallPopular: wall(['a', 'b', 'c'], 2_104),
      wallContributions: null,
      wallNewest: wall(['c', 'a', 'b'], 2_104),
    },
  };

  it('maps the ranked total, the 1k+ repositories, the pulse counts and the walls', () => {
    const org = toOrgFacts(data, 'nebula');
    expect(org?.orgRankTotal).toBe(336_901);
    expect(org?.reposOver1k).toBe(14);
    expect(org?.pulse?.countryCount).toBe(23);
    expect(org?.pulse?.contributors60).toBe(2_410);
    expect(org?.contributorsWall.newest?.entries.map(({ login }) => login)).toEqual(['c', 'a', 'b']);
    expect(org?.contributorsWall.contributions).toBeNull();
  });

  it('has no top share without a ranked total', () => {
    expect(toOrgFacts({ ...data, orgRankTotal: 0 }, 'nebula')?.orgRankTotal).toBeNull();
  });
});
