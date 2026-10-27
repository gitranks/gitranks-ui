import { describe, expect, it } from 'vitest';

import { findBadge } from './catalogue';
import { NOW, orgBig, repoBig, repoMid, repoUnranked, userMid } from './fixtures';
import { defaultParams } from './params';
import { awaitsReadFor, drawsProvisional, HISTORY_READ_STARS, PENDING_KEY, pendingQuery, readsSoon } from './pending';

const badge = (kind: 'user' | 'org' | 'repo', id: string) => findBadge(kind, id)!;
const pendingUser = { ...userMid, s: null, c: null, f: null };

describe('awaitsReadFor', () => {
  it('is a history badge of a repository without its star history, and nothing else of it', () => {
    for (const id of ['star-history', 'stars-card', 'month']) expect(awaitsReadFor(repoMid, id)).toBe(true);
    for (const id of ['rank', 'language-rank', 'stars', 'rank-card']) expect(awaitsReadFor(repoMid, id)).toBe(false);
    expect(awaitsReadFor(repoBig, 'star-history')).toBe(false);
  });

  it("is any badge of a developer whose first read is running; never an organization's", () => {
    expect(awaitsReadFor(pendingUser, 'rank')).toBe(true);
    expect(awaitsReadFor(userMid, 'rank')).toBe(false);
    expect(awaitsReadFor(orgBig, 'rank')).toBe(false);
  });
});

describe('drawsProvisional', () => {
  it('is "preparing" star history and "not yet" images', () => {
    const history = badge('repo', 'star-history');
    expect(drawsProvisional(repoMid, history, defaultParams(history), NOW)).toBe(true);
    expect(drawsProvisional(repoBig, history, defaultParams(history), NOW)).toBe(false);
    const card = badge('repo', 'stars-card');
    expect(drawsProvisional(repoMid, card, defaultParams(card), NOW)).toBe(true);
    const rank = badge('repo', 'rank');
    expect(drawsProvisional(repoMid, rank, defaultParams(rank), NOW)).toBe(false);
    expect(drawsProvisional(repoUnranked, rank, defaultParams(rank), NOW)).toBe(true);
  });
});

describe('pendingQuery', () => {
  it('stamps an image that waits on a read with the time, in base 36', () => {
    const history = badge('repo', 'star-history');
    expect(pendingQuery(repoMid, history, defaultParams(history), NOW)).toEqual({
      [PENDING_KEY]: NOW.getTime().toString(36),
    });
    const rank = badge('user', 'rank');
    expect(pendingQuery(pendingUser, rank, defaultParams(rank), 1_000, NOW)).toEqual({ pending: 'rs' });
  });

  it('adds nothing to an image that draws its badge, or that waits on nothing a read brings', () => {
    const history = badge('repo', 'star-history');
    expect(pendingQuery(repoBig, history, defaultParams(history), NOW)).toEqual({});
    // An unranked repository's rank: "not yet", but no read of its history changes that.
    const rank = badge('repo', 'rank');
    expect(pendingQuery(repoUnranked, rank, defaultParams(rank), NOW)).toEqual({});
    // A month without history draws a neutral "+0 ★", not "not yet".
    const month = badge('repo', 'month');
    expect(pendingQuery(repoMid, month, defaultParams(month), NOW)).toEqual({});
  });
});

describe('readsSoon', () => {
  it('is a repository GitRanks reads the history of on its own, or a developer in a first read', () => {
    expect(readsSoon({ ...repoMid, stars: HISTORY_READ_STARS })).toBe(true);
    expect(readsSoon({ ...repoMid, stars: HISTORY_READ_STARS - 1 })).toBe(false);
    expect(readsSoon(repoBig)).toBe(false);
    expect(readsSoon(pendingUser)).toBe(true);
    expect(readsSoon(userMid)).toBe(false);
    expect(readsSoon(orgBig)).toBe(false);
  });
});
