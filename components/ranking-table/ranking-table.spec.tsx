import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { countries, globalRankings, STARS_NOT_COUNTED_AT } from './__fixtures__/global-rankings';
import { RankingTable } from './ranking-table';

vi.mock('./clickable-row', () => ({
  ClickableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

const valueCells = (html: string) => [...html.matchAll(/<td[^>]*text-right[^>]*>(.*?)<\/td>/g)].map((m) => m[1]);

describe('RankingTable', () => {
  it("strikes the stars ranking's total with the stars not counted through before the honest one", () => {
    const rows = globalRankings('s', 0, STARS_NOT_COUNTED_AT);
    const cells = valueCells(
      renderToStaticMarkup(<RankingTable rankingType="stars" data={rows} countries={countries} />),
    );
    const { s } = rows[STARS_NOT_COUNTED_AT - 1].user ?? {};

    expect(cells[0]).not.toContain('<s ');
    expect(cells[STARS_NOT_COUNTED_AT - 1]).toMatch(
      new RegExp(
        `<s [^>]*>.*${((s ?? 0) + 12_300).toLocaleString('en-US')}.*</s><span>${s?.toLocaleString('en-US')}</span>`,
      ),
    );
  });

  it('shows the plain count on the other rankings', () => {
    const rows = globalRankings('f', 0, 3).map((row) => ({
      ...row,
      user: row.user && { ...row.user, starsNotCounted: { stars: 12_300, repositories: 2 } },
    }));
    const html = renderToStaticMarkup(<RankingTable rankingType="followers" data={rows} countries={countries} />);

    expect(html).not.toContain('<s ');
    expect(valueCells(html)[0]).toBe(rows[0].user?.f?.toLocaleString('en-US'));
  });
});
