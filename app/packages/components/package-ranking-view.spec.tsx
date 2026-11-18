import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { downloadsRanking, packageRankingFacts } from '../__fixtures__/package-rankings';
import { PackageRankingFrame, PackageRankingScreen } from './package-ranking-view';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/header/header', () => ({ Header: () => null }));
vi.mock('@/components/ranking-table/clickable-row', () => ({
  ClickableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));

const PAGE = { registry: 'npm', registryLabel: 'npm', order: 'downloads' } as const;

const jsonLdTypes = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)].map(
    ([, json]) => JSON.parse(json)['@type'],
  );

const visibleText = (html: string) =>
  html
    .replace(/<script[^>]*>.*?<\/script>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;/g, "'");

describe('PackageRankingFrame', () => {
  it('draws the title with its Beta pill, the three orders, the basis, the field and the Beta notice', () => {
    const html = renderToStaticMarkup(
      <PackageRankingFrame {...PAGE} order="dependents-stars">
        <p>page</p>
      </PackageRankingFrame>,
    );
    const text = visibleText(html);

    expect(html).toMatch(/<h1 [^>]*>Package Ranking · Dependents&#x27; stars <span[^>]*>Beta<\/span><\/h1>/);
    expect(text).toContain('Rank by:');
    for (const order of ['downloads', 'dependents-stars', 'dependents']) {
      expect(html).toContain(`href="/packages/npm/${order}/1"`);
    }
    expect(html).toMatch(/data-state="active"[^>]*>Dependents&#x27; stars/);
    expect(text).toContain(
      'Rank is based on the stars of every repository with 100+ stars that uses the package directly, added up.',
    );
    expect(html).toMatch(/<form aria-label="Go to a package"/);
    expect(text).toContain('Package rankings are new. For now we rank npm packages only');
    expect(html).toContain('href="/methodology/packages"');
    expect(html).toContain('<p>page</p>');
  });
});

describe('PackageRankingScreen', () => {
  it('draws the first page with its summary, its questions and their structured data', () => {
    const html = renderToStaticMarkup(
      <PackageRankingScreen {...PAGE} page={1} rows={downloadsRanking} facts={packageRankingFacts} />,
    );
    const text = visibleText(html);

    expect(jsonLdTypes(html)).toEqual(['ItemList', 'BreadcrumbList', 'FAQPage']);
    expect(text).toContain('At the latest monthly read, 41,870 npm packages are used directly');
    expect(text).toContain('read November 16, 2026. Ranks as of November 17, 2026.');
    expect(text).toContain('Which npm package is first by weekly downloads?');
    // Twelve rows are less than a page: no next page.
    expect(html).not.toContain('aria-label="Go to next page"');
  });

  it('draws a later page with the way back and no summary or questions', () => {
    const html = renderToStaticMarkup(<PackageRankingScreen {...PAGE} page={2} rows={downloadsRanking} />);

    expect(jsonLdTypes(html)).toEqual(['ItemList', 'BreadcrumbList']);
    expect(html).toContain('href="/packages/npm/downloads/1"');
    expect(html).not.toContain('data-testid="ranking-stats"');
    expect(html).not.toContain('Questions');
  });

  it('draws one state when the ranking cannot be read now, and another before anything is ranked', () => {
    const unavailable = visibleText(renderToStaticMarkup(<PackageRankingScreen {...PAGE} page={1} rows={undefined} />));
    expect(unavailable).toBe('Package rankings are not available right nowTry again in a few minutes.');

    const empty = visibleText(renderToStaticMarkup(<PackageRankingScreen {...PAGE} page={1} rows={[]} />));
    expect(empty).toContain('No packages are ranked yet');
  });
});
