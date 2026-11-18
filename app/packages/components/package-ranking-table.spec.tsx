import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { dependentsRanking, dependentsStarsRanking, downloadsRanking } from '../__fixtures__/package-rankings';
import { PACKAGE_RANKINGS } from '../package-rankings';
import { PackageRankingTable } from './package-ranking-table';

vi.mock('@/components/ranking-table/clickable-row', () => ({
  ClickableRow: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <tr data-href={href}>{children}</tr>
  ),
}));

const heads = (html: string) =>
  [...html.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map(([, text]) => text.replace(/&#x27;/g, "'"));
const rows = (html: string) => html.split('<tr data-href=').slice(1);

describe('PackageRankingTable', () => {
  it("names the downloads ranking's columns, and draws a row as the board does", () => {
    const html = renderToStaticMarkup(
      <PackageRankingTable ranking={PACKAGE_RANKINGS.downloads} data={downloadsRanking} />,
    );
    const [first, second] = rows(html);

    expect(heads(html)).toEqual(['Rank', 'Package', 'Repository', 'Weekly downloads', 'vs last week']);
    expect(rows(html)).toHaveLength(12);
    expect(first).toMatch(/^"\/package\/npm\/moss-date"/);
    expect(first).toContain('1<span class="text-xs text-positive">↑1</span>');
    expect(first).toContain('alt="mossbyte avatar"');
    expect(first).toContain('>moss-date</span>');
    expect(first).toContain('Dates without time zones until you need them.');
    expect(first).toContain('href="/repo/mossbyte/moss-date"');
    expect(first).toContain('>5,806,310</td>');
    expect(first).toContain('<span class="text-negative">−46,450</span>');
    expect(second).toMatch(/^"\/package\/npm\/@orbit\/fetch"/);
    expect(second).toContain('<span class="text-positive">+53,051</span>');
  });

  it("shows no change as 0, and the registry's mark for a package with no repository", () => {
    const html = renderToStaticMarkup(
      <PackageRankingTable ranking={PACKAGE_RANKINGS.downloads} data={downloadsRanking} />,
    );
    const all = rows(html);

    expect(all[10]).toContain('<span>0</span>');
    expect(all[11]).not.toContain('<img');
    expect(all[11]).toContain('<svg');
    expect(all[11]).not.toContain('href="/repo/');
  });

  it("names the dependents' stars ranking's columns, rounds sums, and leaves a change out until there is one", () => {
    const html = renderToStaticMarkup(
      <PackageRankingTable ranking={PACKAGE_RANKINGS['dependents-stars']} data={dependentsStarsRanking} />,
    );
    const [, second, third] = rows(html);

    expect(heads(html)).toEqual(['Rank', 'Package', 'Repository', "Dependents' stars", 'This month']);
    expect(second).not.toContain('text-positive');
    expect(second).not.toContain('text-negative');
    expect(second).toMatch(/<td[^>]*hidden sm:table-cell text-right[^>]*><\/td>/);
    expect(third).toContain('>3,906,441</td>');
  });

  it("names the dependents ranking's columns", () => {
    const html = renderToStaticMarkup(
      <PackageRankingTable ranking={PACKAGE_RANKINGS.dependents} data={dependentsRanking} />,
    );

    expect(heads(html)).toEqual(['Rank', 'Package', 'Repository', 'Used by', 'New this month']);
    expect(rows(html)[0]).toContain('<span class="text-positive">+41</span>');
  });
});
