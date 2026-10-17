import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { pickNeighbours, StarsRankNeighbours } from './stars-rank-neighbours';

const rows = (from: number, to: number, self?: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => {
    const rank = from + i;
    return { rank, login: rank === self ? 'OctoCat' : `dev${rank}`, stars: 1000 - rank };
  });

const ranksOf = (login: string, rank: number, list: ReturnType<typeof rows>) =>
  pickNeighbours(login, rank, list).map((row) => row.rank);

describe('pickNeighbours', () => {
  it('keeps five rows either side of the profile', () => {
    expect(ranksOf('octocat', 12, rows(2, 22, 12))).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
  });

  it('centres on the profile when the window is off by a gap in the ranks', () => {
    expect(ranksOf('octocat', 16, rows(2, 22, 16))).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]);
  });

  it('keeps what there is near the top and bottom of the ranking', () => {
    expect(ranksOf('octocat', 2, rows(1, 21, 2))).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(ranksOf('octocat', 1000, rows(990, 1000, 1000))).toEqual([995, 996, 997, 998, 999, 1000]);
  });

  it('has nothing to show when the profile is not in the window or is alone', () => {
    expect(ranksOf('octocat', 12, rows(2, 22))).toEqual([]);
    expect(ranksOf('octocat', 12, rows(12, 12, 12))).toEqual([]);
  });

  it('has nothing to show when the window has the profile at another rank than its current one', () => {
    expect(ranksOf('octocat', 12, rows(2, 22, 15))).toEqual([]);
  });
});

describe('StarsRankNeighbours', () => {
  const html = (login: string, list: ReturnType<typeof rows>) =>
    renderToStaticMarkup(<StarsRankNeighbours login={login} rank={12} neighbours={list} />);

  it('links the others and marks the profile’s own row, whatever the login case', () => {
    const markup = html('octocat', rows(2, 22, 12));

    expect(markup).toContain('href="/profile/dev11"');
    expect(markup).not.toContain('href="/profile/OctoCat"');
    expect(markup).toMatch(/<tr[^>]*aria-current="true"[^>]*>(?:(?!<\/tr>).)*@OctoCat/);
  });

  it('renders nothing without the profile’s own row', () => {
    expect(html('someone-else', rows(2, 22, 12))).toBe('');
  });
});
