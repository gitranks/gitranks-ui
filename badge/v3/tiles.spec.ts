import { describe, expect, it } from 'vitest';

import { findBadge } from './catalogue';
import { NOW, orgBig, repoBig, repoMid, userBig, userSmall } from './fixtures';
import { defaultParams, resolveParams } from './params';
import { availableChoices, badgeAlt, badgeTiles, entityPathOf } from './tiles';

const badge = (kind: 'user' | 'org' | 'repo', id: string) => {
  const found = findBadge(kind, id);
  if (!found) throw new Error(`no ${kind} badge ${id}`);
  return found;
};

describe('builder links', () => {
  it("opens the builder's last step for a badge with its options, never its defaults", () => {
    const tiles = badgeTiles(repoMid, [{ id: 'rank' }, { id: 'rank-card' }], NOW);
    expect(tiles.map(({ href }) => href)).toEqual([
      '/badge/builder?repo=acme/fastqueue&badge=rank&step=embed',
      '/badge/builder?repo=acme/fastqueue&badge=rank-card&step=embed',
    ]);
    const [country, global] = badgeTiles(
      userSmall,
      [
        { id: 'rank', query: { scope: 'country' } },
        { id: 'rank', query: { scope: 'global' } },
      ],
      NOW,
    );
    expect(country.href).toBe('/badge/builder?user=octo-dev&badge=rank&scope=country&step=embed');
    expect(global.href).toBe('/badge/builder?user=octo-dev&badge=rank&step=embed');
  });
});

describe('alt text', () => {
  it('states the fact a shield shows', () => {
    const rank = badge('repo', 'rank');
    expect(badgeAlt(repoMid, rank, defaultParams(rank), NOW)).toBe(
      'acme/fastqueue on GitRanks: repo rank #41,206 · top 1%',
    );
    const userRank = badge('user', 'rank');
    expect(badgeAlt(userSmall, userRank, resolveParams(userRank, { scope: 'country' }), NOW)).toMatch(
      /^octo-dev on GitRanks: stars rank #9,120/,
    );
  });

  it('states the fact a card or chart shows', () => {
    const rankCard = badge('repo', 'rank-card');
    expect(badgeAlt(repoMid, rankCard, defaultParams(rankCard), NOW)).toBe(
      'acme/fastqueue on GitRanks: #41,206 of 5.3M repos',
    );
    const starredBy = badge('repo', 'starred-by-card');
    expect(badgeAlt(repoBig, starredBy, defaultParams(starredBy), NOW)).toBe(
      'nebula/ui on GitRanks: starred by 1,284 top developers',
    );
    const profile = badge('user', 'profile-card');
    expect(badgeAlt(userBig, profile, defaultParams(profile), NOW)).toBe('octo-dev on GitRanks: #13 by stars');
    const orgCard = badge('org', 'org-card');
    expect(badgeAlt(orgBig, orgCard, defaultParams(orgCard), NOW)).toMatch(
      /^nebula on GitRanks: #[\d,]+ of [\d.]+k organizations$/,
    );
  });
});

describe('tiles', () => {
  it('draws each badge by its URL in both drawings of Auto and links to its code', () => {
    const [tile] = badgeTiles(userSmall, [{ id: 'rank', query: { by: 'contributions' } }], NOW);
    expect(tile).toEqual({
      key: 'rank?by=contributions',
      format: 'shield',
      src: {
        light: '/badge/user/octo-dev/rank.svg?by=contributions&theme=light',
        dark: '/badge/user/octo-dev/rank.svg?by=contributions&theme=dark',
      },
      alt: 'octo-dev on GitRanks: contrib rank #8,210 · top 1%',
      href: '/badge/builder?user=octo-dev&badge=rank&by=contributions&step=embed',
      size: null,
    });
  });

  it('gives cards and charts their drawing size', () => {
    const tiles = badgeTiles(repoBig, [{ id: 'starred-by-card' }, { id: 'star-history' }], NOW);
    expect(tiles.map(({ format, size }) => [format, size])).toEqual([
      ['card', { width: 400, height: 140 }],
      ['chart', { width: 1000, height: 400 }],
    ]);
  });

  it('leaves out an unknown badge and a query the badge cannot take', () => {
    expect(badgeTiles(repoMid, [{ id: 'nope' }, { id: 'rank', query: { extra: 'race' } }], NOW)).toEqual([]);
  });

  it('keeps the available choices only', () => {
    const choices = [
      { id: 'rank' },
      { id: 'starred-by-card' },
      { id: 'rank', query: { extra: 'race' } },
      { id: 'nope' },
    ];
    expect(availableChoices(repoMid, choices, NOW)).toEqual([{ id: 'rank' }]);
    expect(availableChoices(repoBig, choices, NOW)).toEqual([{ id: 'rank' }, { id: 'starred-by-card' }]);
  });

  it('names the entity by its stored spelling', () => {
    expect(entityPathOf(repoBig)).toEqual({ kind: 'repo', nameWithOwner: 'nebula/ui' });
    expect(entityPathOf(orgBig)).toEqual({ kind: 'org', login: orgBig.login });
  });
});
