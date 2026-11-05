import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { RepoRankingTable } from './repo-ranking-table';

vi.mock('@/components/ranking-table/clickable-row', () => ({
  ClickableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

const row = (starsCheck: { notCounted: number; githubStars: number } | null = null) =>
  ({
    githubId: 'R1',
    s: 21,
    sM: 21,
    l: 2,
    lM: 2,
    repo: {
      githubId: 'R1',
      owner: 'react',
      name: 'react',
      nameWithOwner: 'react/react',
      ownerAvatarUrl: 'https://avatars.example/u/1?v=4',
      description: null,
      language: 'JavaScript',
      stars: 251_726,
      starsCheck,
      gainedThisMonth: 3_100,
    },
  }) as never;

describe('RepoRankingTable', () => {
  it('has five columns, none of them a Tier column', () => {
    const html = renderToStaticMarkup(<RepoRankingTable data={[row()]} />);

    expect(html.match(/<th[\s>]/g)).toHaveLength(5);
    expect(html.match(/<td[\s>]/g)).toHaveLength(5);
    expect(html).not.toContain('>Tier<');
  });

  it('shows the honest stars, with a plain count while every star counts', () => {
    const html = renderToStaticMarkup(<RepoRankingTable data={[row()]} />);

    expect(html).toContain('251,726');
    expect(html).not.toContain('<s ');
  });

  it("strikes GitHub's count through before the honest one, which stays in the column", () => {
    const html = renderToStaticMarkup(<RepoRankingTable data={[row({ notCounted: 3_720, githubStars: 255_446 })]} />);
    const cell = html.match(/<td[^>]*text-right[^>]*>(.*?)<\/td>/)?.[1] ?? '';

    expect(cell).toMatch(/<s [^>]*>.*255,446.*<\/s><span>251,726<\/span>/);
  });
});
