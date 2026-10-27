import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { RepoRankingTable } from './repo-ranking-table';

vi.mock('@/components/ranking-table/clickable-row', () => ({
  ClickableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

const row = (tier: { tier: number; level: number } | null, languageTier: { tier: number; level: number } | null) =>
  ({
    githubId: 'R1',
    s: 21,
    sM: 21,
    l: 2,
    lM: 2,
    tier,
    languageTier,
    repo: {
      githubId: 'R1',
      owner: 'react',
      name: 'react',
      nameWithOwner: 'react/react',
      ownerAvatarUrl: 'https://avatars.example/u/1?v=4',
      description: null,
      language: 'JavaScript',
      stars: 251_726,
      gainedThisMonth: 3_100,
    },
  }) as never;

describe('RepoRankingTable', () => {
  it('shows the global tier on a language ranking too, as on the repository page', () => {
    const html = renderToStaticMarkup(
      <RepoRankingTable data={[row({ tier: 7, level: 5 }, { tier: 6, level: 1 })]} rankProp="l" />,
    );

    expect(html).toContain('Supernova 5');
    expect(html).not.toContain('Galaxy 1');
  });

  it('shows the tier in its column only, with no badge on the owner avatar', () => {
    const html = renderToStaticMarkup(<RepoRankingTable data={[row({ tier: 7, level: 5 }, null)]} />);

    expect(html).not.toContain('aria-label="Supernova 5"');
    expect(html).not.toContain('ring-background');
  });

  it('leaves the tier out of a row without one', () => {
    const html = renderToStaticMarkup(<RepoRankingTable data={[row(null, null)]} />);

    expect(html).not.toMatch(/Supernova|Stardust/);
  });
});
