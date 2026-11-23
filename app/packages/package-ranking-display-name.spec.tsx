import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { downloadsRanking } from './__fixtures__/package-rankings';
import { PackageRankingScreen } from './components/package-ranking-view';
import { buildPackageRankingMetadata } from './seo';
import { PackagesSection } from '@/app/components/landing/packages-section';
import type { PackageRankRows } from '@/graphql/helpers/fetch-package-rankings';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/ranking-table/clickable-row', () => ({
  ClickableRow: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <tr data-href={href}>{children}</tr>
  ),
}));

/**
 * The top of NuGet's downloads ranking: names stored folded to lower case, the first two with the registry's own
 * spelling, the third not yet read again (`null`).
 */
const nugetRows: PackageRankRows = [
  { ...downloadsRanking[0], rank: 1, name: 'newtonsoft.json', displayName: 'Newtonsoft.Json' },
  { ...downloadsRanking[1], rank: 2, name: 'serilog', displayName: 'Serilog' },
  { ...downloadsRanking[2], rank: 3, name: 'xunit', displayName: null },
];

const PAGE = { registry: 'nuget', registryLabel: 'NuGet', order: 'downloads' } as const;

const visibleText = (html: string) =>
  html
    .replace(/<script[^>]*>.*?<\/script>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ');
const jsonLd = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(([, json]) => JSON.parse(json));

describe("a package ranking's names as the registry writes them", () => {
  const html = renderToStaticMarkup(<PackageRankingScreen {...PAGE} page={1} rows={nugetRows} facts={{ ranked: 3 }} />);
  const text = visibleText(html);

  it('shows a row by its display name and links it by its name, and falls back to the name without one', () => {
    const rows = html.split('<tr data-href=').slice(1);

    expect(rows[0]).toMatch(/^"\/package\/nuget\/newtonsoft\.json"/);
    expect(rows[0]).toContain('href="/package/nuget/newtonsoft.json"');
    expect(rows[0]).toContain('<span translate="no" class="min-w-0 [overflow-wrap:anywhere]">Newtonsoft.Json</span>');
    expect(rows[1]).toContain('>Serilog</span>');
    expect(rows[2]).toMatch(/^"\/package\/nuget\/xunit"/);
    expect(rows[2]).toContain('>xunit</span>');
    expect(text).not.toContain('newtonsoft.json');
    expect(text).not.toContain('serilog');
  });

  it('names the leaders by their display names in the summary and the questions, linked by their names', () => {
    expect(text).toContain('the top three are Newtonsoft.Json');
    expect(html).toMatch(/href="\/package\/nuget\/newtonsoft\.json"[^>]*>Newtonsoft\.Json</);
    expect(text).toContain('Newtonsoft.Json, with ');
    expect(text).toContain('Then Serilog and xunit.');
  });

  it("writes the display names in the page's ItemList and description, and the names in their addresses", () => {
    const itemList = jsonLd(html).find((payload) => payload['@type'] === 'ItemList');
    const items = itemList.itemListElement as { name: string; url: string }[];

    expect(items.map(({ name }) => name)).toEqual(['Newtonsoft.Json', 'Serilog', 'xunit']);
    expect(items[0].url).toMatch(/\/package\/nuget\/newtonsoft\.json$/);

    const { description } = buildPackageRankingMetadata({ ...PAGE, page: 1, rows: nugetRows });
    expect(description).toContain('The top 3: Newtonsoft.Json, Serilog and xunit.');
  });

  it("shows the home page's rows by their display names, linked by their names", () => {
    const npmRows: PackageRankRows = [
      { ...downloadsRanking[0], displayName: 'Moss-Date' },
      { ...downloadsRanking[1], displayName: null },
    ];
    const landing = renderToStaticMarkup(
      <PackagesSection boards={[{ order: 'downloads', rows: npmRows }]} ranked={null} downloadsTo={null} />,
    );

    expect(landing).toContain('href="/package/npm/moss-date"');
    expect(landing).toMatch(/translate="no">Moss-Date</);
    expect(landing).toContain('href="/package/npm/@orbit/fetch"');
    expect(landing).toMatch(/translate="no">@orbit\/fetch</);
    expect(landing).not.toMatch(/>moss-date</);
  });
});
