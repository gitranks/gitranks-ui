import { describe, expect, it } from 'vitest';

import { badgeImagePath, hasProfileCard, hasRankCard, SOCIAL_CARD_SIZE, socialCardPath } from './links';

describe('badge image paths', () => {
  it('spells each kind of entity as its badge route reads it', () => {
    expect(badgeImagePath({ kind: 'user', login: 'Octo-Cat' }, 'rank', 'svg')).toBe('/badge/user/Octo-Cat/rank.svg');
    expect(badgeImagePath({ kind: 'org', login: 'vercel' }, 'org-card', 'png')).toBe('/badge/org/vercel/org-card.png');
    expect(badgeImagePath({ kind: 'repo', nameWithOwner: 'vercel/next.js' }, 'rank-card', 'png')).toBe(
      '/badge/repo/vercel/next.js/rank-card.png',
    );
  });

  it('encodes each path segment and writes the query in the order given', () => {
    expect(
      badgeImagePath({ kind: 'repo', nameWithOwner: 'a b/c#d' }, 'rank', 'png', { by: 'x&y', size: 'social' }),
    ).toBe('/badge/repo/a%20b/c%23d/rank.png?by=x%26y&size=social');
  });

  it("points link previews at each entity's own card, drawn for social sharing", () => {
    expect(socialCardPath({ kind: 'user', login: 'octocat' })).toBe('/badge/user/octocat/profile-card.png?size=social');
    expect(socialCardPath({ kind: 'repo', nameWithOwner: 'vercel/next.js' })).toBe(
      '/badge/repo/vercel/next.js/rank-card.png?size=social',
    );
    expect(socialCardPath({ kind: 'org', login: 'vercel' })).toBe('/badge/org/vercel/org-card.png?size=social');
  });

  it('draws social cards at 1200×630', () => {
    expect(SOCIAL_CARD_SIZE).toEqual({ width: 1200, height: 630 });
  });
});

describe('card availability', () => {
  it('gives a developer a profile card from the stars or the contributions ranking', () => {
    expect(hasProfileCard({ s: 10, c: 0 }, { s: 3 })).toBe(true);
    expect(hasProfileCard({ s: 0, c: 10 }, { c: 3 })).toBe(true);
    expect(hasProfileCard({ s: 0, c: 0, f: 900 }, { f: 3 })).toBe(false);
  });

  it('needs a rank where the ranks are known, and the score alone where they are not', () => {
    expect(hasProfileCard({ s: 10 }, null)).toBe(false);
    expect(hasProfileCard({ s: 10 }, { s: null })).toBe(false);
    expect(hasProfileCard({ s: 10 }, { s: null, sProvisional: 40 })).toBe(true);
    expect(hasProfileCard({ s: 10 }, undefined)).toBe(true);
    expect(hasProfileCard({ s: 4 }, undefined)).toBe(false);
  });

  it('gives a repository or an organization its card once it has a global rank', () => {
    expect(hasRankCard({ s: 1 })).toBe(true);
    expect(hasRankCard({ s: null })).toBe(false);
    expect(hasRankCard({})).toBe(false);
    expect(hasRankCard(null)).toBe(false);
  });
});
