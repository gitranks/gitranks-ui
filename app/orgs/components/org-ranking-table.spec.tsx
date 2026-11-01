import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { OrgRankingTable } from './org-ranking-table';
import type { OrgRankingsQuery } from '@/types/generated/graphql';

vi.mock('@/components/ranking-table/clickable-row', () => ({
  ClickableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

const row = (s: number, starsNotCounted: { stars: number; repositories: number } | null) =>
  ({
    githubId: 'O_1',
    s: 1,
    sM: 1,
    organization: {
      login: 'nebula',
      name: null,
      avatarUrl: null,
      location: null,
      country: null,
      isVerified: true,
      s,
      starsNotCounted,
    },
  }) as OrgRankingsQuery['orgRankings'][number];

describe('OrgRankingTable', () => {
  it('shows the honest total while every star counts', () => {
    const html = renderToStaticMarkup(<OrgRankingTable data={[row(312_000, null)]} countries={[]} />);

    expect(html).toContain('312,000');
    expect(html).not.toContain('<s ');
  });

  it('strikes the total with the stars not counted through before the honest one', () => {
    const html = renderToStaticMarkup(
      <OrgRankingTable data={[row(312_000, { stars: 9_400, repositories: 1 })]} countries={[]} />,
    );

    expect(html).toMatch(/<s [^>]*>.*321,400.*<\/s><span>312,000<\/span>/);
  });
});
