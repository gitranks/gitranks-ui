import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ReposSection, risingRepos } from './repos-section';
import type { RepoRankingsQuery } from '@/types/generated/graphql';

type Row = RepoRankingsQuery['repoRankings'][number];

const row = (s: number, gainedThisMonth: number | null, sM: number | null = s): Row => ({
  githubId: `R_${s}`,
  s,
  sM,
  repo: {
    githubId: `R_${s}`,
    owner: `owner-${s}`,
    name: `repo-${s}`,
    nameWithOwner: `owner-${s}/repo-${s}`,
    ownerAvatarUrl: `https://avatars.githubusercontent.com/u/${s}?v=4`,
    stars: 100_000 - s,
    gainedThisMonth,
  },
});

const render = (rows: Row[]) => renderToStaticMarkup(<ReposSection rows={rows} />);

describe('ReposSection', () => {
  it('renders nothing before repositories are ranked', () => {
    expect(render([])).toBe('');
    expect(
      render([
        { githubId: 'R_1', s: 1, repo: null },
        { ...row(2, 5), s: null },
      ]),
    ).toBe('');
  });

  it('lists the top 10 with links to their pages and the rankings', () => {
    const html = render(Array.from({ length: 30 }, (_, i) => row(i + 1, 10)));

    expect(html).toContain('href="/repo/owner-1/repo-1"');
    expect(html).toContain('href="/repo/owner-10/repo-10"');
    expect(html).not.toContain('owner-11/repo-11');
    expect(html).toContain('href="/repos/1"');
    expect(html).toContain('href="/repos/languages"');
    expect(html).toContain('among the top 30');
  });

  it('leaves out the rising card when nothing gained stars this month', () => {
    const html = render([row(1, 0), row(2, null), row(3, -4)]);

    expect(html).toContain('owner-1/repo-1');
    expect(html).not.toContain('Rising this month');
  });
});

describe('risingRepos', () => {
  it('picks the five biggest gainers, gainers only', () => {
    const rows = [row(1, 50), row(2, -10), row(3, 900), row(4, 0), row(5, 300), row(6, 20), row(7, 40), row(8, 10)];
    const picked = risingRepos(rows as Parameters<typeof risingRepos>[0]).map((r) => r.s);

    expect(picked).toEqual([3, 5, 1, 7, 6]);
  });
});
