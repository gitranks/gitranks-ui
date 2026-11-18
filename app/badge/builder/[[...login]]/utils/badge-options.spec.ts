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
  settleStyle,
  valueChoices,
} from './badge-options';
import { styleQuery } from './builder-state';
import { badgeImageUrl, badgeLinkUrl, snippetOf } from './snippets';
import { badgesOf, findBadge } from '@/badge/v3/catalogue';
import {
  NOW,
  orgBig,
  orgUnranked,
  packageBig,
  repoBig,
  repoHero,
  repoMid,
  repoUnranked,
  userBig,
  userMid,
  userSmall,
  userUnranked,
} from '@/badge/v3/fixtures';
import { resolveParams } from '@/badge/v3/params';
import { shieldContent } from '@/badge/v3/shields';

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
      'contribute',
      'rank-card',
      'tier-card',
      'star-history',
    ]);
    expect(ids(repoUnranked)).toEqual(['contribute', 'star-history']);
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
  it("names the Contribute badge alone, so the builder's Markdown is the maintainers page's", () => {
    const contribute = badge('repo', 'contribute');
    const alt = badgeAlt(repoMid, contribute, {}, NOW);
    expect(alt).toBe('GitRanks Contribute');
    const snippet = {
      imageUrl: badgeImageUrl('https://gitranks.com', 'repo', 'owner/name', 'contribute', styleQuery(contribute, {})),
      pageUrl: badgeLinkUrl('https://gitranks.com', 'contribute', 'repo', 'owner/name'),
      alt,
      auto: false,
    };
    expect(snippetOf('markdown', snippet)).toBe(
      '[![GitRanks Contribute](https://gitranks.com/badge/repo/owner/name/contribute.svg)](https://gitranks.com/contribute/maintainers?utm_source=badge&utm_medium=readme)',
    );
  });

  it('states the fact', () => {
    expect(badgeAlt(repoMid, badge('repo', 'rank'), {}, NOW)).toBe(
      'acme/fastqueue on GitRanks: repo rank #41,206 · top 1%',
    );
    expect(badgeAlt(repoBig, badge('repo', 'star-history'), {}, NOW)).toBe('nebula/ui on GitRanks: star history');
    expect(badgeAlt(userMid, badge('user', 'tier'), {}, NOW)).toMatch(/^octo-dev on GitRanks: gitranks \S+$/);
  });

  it('says the Unsung hero badge without naming the site twice', () => {
    expect(badgeAlt(repoHero, badge('repo', 'unsung-hero'), {}, NOW)).toBe(
      'nebula/ui on GitRanks: Unsung hero · Nov 2026',
    );
  });

  it("keeps every other shield's label in its alt text", () => {
    for (const entity of [repoHero, userBig, orgBig, packageBig]) {
      const name =
        entity.kind === 'package' ? entity.name : entity.kind === 'repo' ? entity.nameWithOwner : entity.login;
      for (const each of badgesOf(entity.kind)) {
        if (each.format !== 'shield' || each.id === 'contribute' || each.id === 'unsung-hero') continue;
        const content = shieldContent(entity, each, resolveParams(each, new URLSearchParams()), NOW);
        if (!content) continue;
        const text = (segment: typeof content.value | undefined) => segment?.runs.map((run) => run.text).join('') ?? '';
        const extra = text(content.extra);
        expect(badgeAlt(entity, each, {}, NOW), `${entity.kind} ${each.id}`).toBe(
          `${name} on GitRanks: ${content.label} ${text(content.value)}${extra ? ` · ${extra}` : ''}`,
        );
      }
    }
  });
});

describe('settleStyle', () => {
  const rank = badge('user', 'rank');

  it('drops an option the entity lacks before the badge counts as unavailable', () => {
    const noCountryRank = { ...userMid, rankCountry: null };
    expect(settleStyle(noCountryRank, rank, { scope: 'country', extra: 'month' }, NOW)).toEqual({ extra: 'month' });
    const wall = badge('org', 'contributors-wall');
    expect(settleStyle(orgBig, wall, { order: 'contributions', rows: '2' }, NOW)).toEqual({ rows: '2' });
  });

  it('keeps a style that works, and the options just chosen', () => {
    expect(settleStyle(userMid, rank, { scope: 'country' }, NOW)).toEqual({ scope: 'country' });
    expect(settleStyle({ ...userMid, rankCountry: null }, rank, { scope: 'country' }, NOW, ['scope'])).toBeNull();
  });

  it('gives up when nothing makes the badge available', () => {
    expect(settleStyle(userUnranked, rank, { scope: 'country' }, NOW)).toBeNull();
  });
});
