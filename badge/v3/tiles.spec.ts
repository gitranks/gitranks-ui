import { describe, expect, it } from 'vitest';

import { findBadge } from './catalogue';
import { NOW, orgBig, repoBig, repoMid, userBig, userMid, userSmall } from './fixtures';
import { defaultParams, resolveParams } from './params';
import { promotedBadges } from './promotion';
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

  it("opens the builder's first step for the gallery, with the badge and its options kept", () => {
    const tiles = badgeTiles(
      repoBig,
      [
        { id: 'star-history' },
        { id: 'rank', query: { extra: 'month' } },
        { id: 'contributors-wall', query: { rows: '2' } },
      ],
      NOW,
      'find',
    );
    expect(tiles.map(({ href }) => href)).toEqual([
      '/badge/builder?repo=&badge=star-history',
      '/badge/builder?repo=&badge=rank&extra=month',
      '/badge/builder?repo=&badge=contributors-wall&rows=2',
    ]);
    const [user] = badgeTiles(userSmall, [{ id: 'rank', query: { scope: 'country' } }], NOW, 'find');
    expect(user.href).toBe('/badge/builder?user=&badge=rank&scope=country');
  });
});

describe('image URLs', () => {
  it('stamp an image with the render time while it draws "not yet" for want of a read, never its link', () => {
    const stamp = NOW.getTime().toString(36);
    const [card] = badgeTiles(repoMid, [{ id: 'stars-card', query: { scheme: 'night' } }], NOW, 'find');
    expect(card.pending).toBe(true);
    expect(card.src).toEqual({
      light: `/badge/repo/acme/fastqueue/stars-card.svg?scheme=night&theme=light&pending=${stamp}`,
      dark: `/badge/repo/acme/fastqueue/stars-card.svg?scheme=night&theme=dark&pending=${stamp}`,
    });
    expect(card.href).not.toContain('pending');
    const [later] = badgeTiles(repoMid, [{ id: 'stars-card' }], new Date(NOW.getTime() + 60_000));
    expect(later.src.light).not.toContain(stamp);
  });

  it('use the clean URL for a badge that draws without the read, and once the read is made', () => {
    const [rank] = badgeTiles(repoMid, [{ id: 'rank' }], NOW);
    expect(rank).toMatchObject({ pending: false, src: { light: '/badge/repo/acme/fastqueue/rank.svg?theme=light' } });
    const [read] = badgeTiles(repoBig, [{ id: 'stars-card' }], NOW);
    expect(read).toMatchObject({ pending: false, src: { light: '/badge/repo/nebula/ui/stars-card.svg?theme=light' } });
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

describe('alt text of charts and cards', () => {
  it('counts the months the chart draws', () => {
    const chart = badge('user', 'count-chart');
    expect(badgeAlt(userBig, chart, defaultParams(chart), NOW)).toBe(
      'octo-dev on GitRanks: stars on own repositories, last 24 months',
    );
    expect(badgeAlt(userMid, chart, defaultParams(chart), NOW)).toBe(
      'octo-dev on GitRanks: stars on own repositories, last 3 months',
    );
  });

  it("reads a profile card's provisional rank as the card does", () => {
    const card = badge('user', 'profile-card');
    const provisional = {
      ...userBig,
      rankGlobal: { ...userBig.rankGlobal!, s: null, sProvisional: 40 },
    };
    expect(badgeAlt(provisional, card, defaultParams(card), NOW)).toBe('octo-dev on GitRanks: #40 by stars');
  });
});

describe('page promotion', () => {
  it('shows star history on a page only when the repository has one', () => {
    expect(promotedBadges(repoBig, NOW).map(({ id }) => id)).toContain('star-history');
    expect(promotedBadges({ ...repoBig, history: null }, NOW).map(({ id }) => id)).not.toContain('star-history');
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
      pending: false,
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

  it("reserves a wall's drawn size from its rows and people", () => {
    const [three, two] = badgeTiles(
      repoBig,
      [{ id: 'contributors-wall' }, { id: 'contributors-wall', query: { rows: '2' } }],
      NOW,
    );
    expect(three.size).toEqual({ width: 800, height: 248 });
    expect(two.size).toEqual({ width: 800, height: 206 });
    expect(badgeTiles(repoMid, [{ id: 'contributors-wall' }], NOW)[0].size).toBeNull();
  });

  it('names the entity by its stored spelling', () => {
    expect(entityPathOf(repoBig)).toEqual({ kind: 'repo', nameWithOwner: 'nebula/ui' });
    expect(entityPathOf(orgBig)).toEqual({ kind: 'org', login: orgBig.login });
  });
});
