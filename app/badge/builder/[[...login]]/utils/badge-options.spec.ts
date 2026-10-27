import { describe, expect, it } from 'vitest';

import {
  badgeAlt,
  byChoices,
  extraChoices,
  languageChoices,
  offeredBadges,
  orderChoices,
  paramsOf,
  rankAmongChoices,
  schemeChoices,
  scopeChoices,
  valueChoices,
} from './badge-options';
import { findBadge } from '@/badge/v3/catalogue';
import {
  NOW,
  orgBig,
  orgUnranked,
  repoBig,
  repoMid,
  repoUnranked,
  userBig,
  userMid,
  userSmall,
  userUnranked,
} from '@/badge/v3/fixtures';

const badge = (kind: 'user' | 'org' | 'repo', id: string) => findBadge(kind, id)!;
const ids = (entity: Parameters<typeof offeredBadges>[0]) => offeredBadges(entity, NOW).map(({ badge }) => badge.id);

describe('offeredBadges', () => {
  it('offers only available badges, in catalogue order', () => {
    expect(ids(repoMid)).toEqual([
      'rank',
      'language-rank',
      'goal',
      'stars',
      'month',
      'tier',
      'rank-card',
      'tier-card',
      'star-history',
    ]);
    expect(ids(repoUnranked)).toEqual(['star-history']);
    expect(ids(userUnranked)).toEqual([]);
    expect(ids(orgUnranked)).toEqual([]);
  });

  it('never offers the developer contributors wall', () => {
    expect(userBig.contributorsWall.popular?.entries.length).toBeGreaterThan(3);
    expect(ids(userBig)).not.toContain('contributors-wall');
  });

  it('starts a developer badge in the first ranking they are in', () => {
    const contributor = { ...userSmall, s: 2 };
    const rank = offeredBadges(contributor, NOW).find(({ badge }) => badge.id === 'rank');
    expect(rank?.style).toEqual({ by: 'contributions' });
    expect(offeredBadges(userMid, NOW).find(({ badge }) => badge.id === 'rank')?.style).toEqual({});
  });
});

describe('style choices', () => {
  it('lists the extras that have something to show, with what they say', () => {
    const rank = badge('repo', 'rank');
    expect(extraChoices(repoMid, rank, paramsOf(rank, {})!, NOW)).toEqual([
      { value: 'top', name: 'Top share', sample: 'top 1%' },
      { value: 'month', name: 'This month', sample: '↑312' },
      { value: 'goal', name: 'Rank goal', sample: '8 ★ to top 25 Rust repos' },
    ]);
    expect(
      extraChoices({ ...repoMid, rankGoal: null }, rank, paramsOf(rank, {})!, NOW).map(({ value }) => value),
    ).toEqual(['top', 'month']);
    expect(extraChoices(repoMid, badge('repo', 'rank-card'), paramsOf(badge('repo', 'rank-card'), {})!, NOW)).toEqual(
      [],
    );
  });

  it('never offers the contributors value again as the extra', () => {
    const contributors = badge('repo', 'contributors');
    const params = paramsOf(contributors, { value: 'countries' })!;
    const extras = extraChoices(repoBig, contributors, params, NOW).map(({ value }) => value);
    expect(extras).not.toContain('countries');
    expect(extras).toContain('12mo');
  });

  it('lists contributor values the entity has; organizations have no Legends', () => {
    expect(valueChoices(repoBig, badge('repo', 'contributors')).map(({ value }) => value)).toEqual([
      '12mo',
      'month',
      'new',
      '5yr',
      'countries',
      'legends',
    ]);
    expect(valueChoices(orgBig, badge('org', 'contributors')).map(({ value }) => value)).not.toContain('legends');
  });

  it('offers rankings and the country list where the badge is available', () => {
    const rank = badge('user', 'rank');
    expect(byChoices(userMid, rank, {}, NOW).map(({ value }) => value)).toEqual([
      'stars',
      'contributions',
      'followers',
    ]);
    expect(byChoices({ ...userSmall, s: 2 }, rank, {}, NOW).map(({ value }) => value)).toEqual([
      'contributions',
      'followers',
    ]);
    expect(scopeChoices(userMid, rank, {}, NOW)).toEqual([
      { value: 'global', name: 'All developers' },
      { value: 'country', name: 'Ukraine' },
    ]);
    expect(scopeChoices({ ...userMid, country: null }, rank, {}, NOW)).toEqual([]);
  });

  it("lists a developer's ranked languages, best first", () => {
    expect(languageChoices(userMid, badge('user', 'language-rank')).map(({ value }) => value)).toEqual([
      'Rust',
      'TypeScript',
    ]);
    expect(languageChoices(userMid, badge('user', 'rank'))).toEqual([]);
  });

  it("lists a wall's orders that have people", () => {
    expect(orderChoices(orgBig, badge('org', 'contributors-wall'), {}, NOW).map(({ value }) => value)).toEqual([
      'popular',
      'newest',
    ]);
  });

  it("switches a repository's rank between all repositories and its language", () => {
    expect(rankAmongChoices(repoMid, badge('repo', 'rank'), NOW)).toEqual([
      { value: 'rank', name: 'All repositories' },
      { value: 'language-rank', name: 'Rust' },
    ]);
    expect(rankAmongChoices(repoMid, badge('repo', 'stars'), NOW)).toEqual([]);
  });

  it('offers Tier color on tier shields only, and no Custom on cards and charts', () => {
    expect(schemeChoices(badge('user', 'rank')).map(({ value }) => value)).toEqual([
      'auto',
      'night',
      'violet',
      'classic',
      'custom',
    ]);
    expect(schemeChoices(badge('user', 'tier')).map(({ value }) => value)).toEqual([
      'auto',
      'night',
      'violet',
      'tier',
      'classic',
      'custom',
    ]);
    expect(schemeChoices(badge('repo', 'star-history')).map(({ value }) => value)).toEqual([
      'auto',
      'night',
      'violet',
      'classic',
    ]);
  });
});

describe('badgeAlt', () => {
  it('states the fact', () => {
    expect(badgeAlt(repoMid, badge('repo', 'rank'), {}, NOW)).toBe(
      'acme/fastqueue on GitRanks: repo rank #41,206 · top 1%',
    );
    expect(badgeAlt(repoBig, badge('repo', 'star-history'), {}, NOW)).toBe('nebula/ui on GitRanks: star history');
    expect(badgeAlt(userMid, badge('user', 'tier'), {}, NOW)).toMatch(/^octo-dev on GitRanks: gitranks \S+$/);
  });
});
