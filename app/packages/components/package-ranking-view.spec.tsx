import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { downloadsRanking, packageRankingFacts } from '../__fixtures__/package-rankings';
import { PackageRankingFrame, PackageRankingScreen } from './package-ranking-view';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/packages' }));
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

    expect(html).toMatch(/<h1 [^>]*>Package Ranking · Dependents&#x27; stars<\/h1><span[^>]*>Beta<\/span>/);
    expect(text).toContain('Rank by');
    for (const order of ['downloads', 'dependents-stars', 'dependents']) {
      expect(html).toContain(`href="/packages/npm/${order}/1"`);
    }
    expect(html).toMatch(/data-state="active"[^>]*>Dependents&#x27; stars/);
    expect(text).toContain(
      'Rank is based on the stars of every repository with 100+ stars that uses the package directly, added up.',
    );
    expect(html).toMatch(/<form aria-label="Go to a package"/);
    expect(text).toContain(
      'Package rankings are new. For now we rank npm, PyPI, Go, crates.io, pub.dev, Packagist, Maven Central, NuGet and RubyGems packages only',
    );
    expect(text).toContain('that list the package in their own package.json.');
    expect(html).toContain('<nav aria-label="Registry">');
    expect(text).toContain('npmPyPIGocrates.iopub.devPackagistMaven CentralNuGetRubyGems');
    expect(html).toMatch(/aria-current="page"[^>]*>(<span[^>]*>)?<svg[^>]*>.*?<\/svg>npm</);
    expect(html).toContain('href="/methodology/packages"');
    expect(html).toContain('<p>page</p>');
  });
});

describe('the registry tabs', () => {
  it("lead to each registry's ranking in the same order, else by dependents' stars", () => {
    const html = renderToStaticMarkup(
      <PackageRankingFrame registry="npm" order="downloads">
        <p>page</p>
      </PackageRankingFrame>,
    );

    expect(html).toContain('href="/packages/pypi/downloads/1"');
    expect(html).toContain('href="/packages/go/dependents-stars/1"');
    expect(html).toContain('href="/packages/maven/dependents-stars/1"');
  });

  it('mark the registry shown, and its "Rank by" holds only its own orders', () => {
    const html = renderToStaticMarkup(
      <PackageRankingFrame registry="go" order="dependents-stars">
        <p>page</p>
      </PackageRankingFrame>,
    );

    expect(html).toMatch(/aria-current="page"[^>]*href="\/packages\/go\/dependents-stars\/1"/);
    expect(html).not.toContain('href="/packages/go/downloads/1"');
    expect(html).toContain('href="/packages/go/dependents/1"');
    expect(visibleText(html)).not.toMatch(/Rank by.*Downloads/);
  });
});

describe('the downloads ranking header', () => {
  it('names the last of its 7 days, and no day when it is not known', () => {
    const dated = visibleText(
      renderToStaticMarkup(
        <PackageRankingFrame registry="npm" order="downloads" downloadsThrough="2026-11-15T00:00:00.000Z">
          {null}
        </PackageRankingFrame>,
      ),
    );
    expect(dated).toContain('Rank is based on npm downloads in the 7 days to November 15, 2026.');

    const undated = visibleText(
      renderToStaticMarkup(
        <PackageRankingFrame registry="npm" order="downloads">
          {null}
        </PackageRankingFrame>,
      ),
    );
    expect(undated).toContain('Rank is based on npm downloads over 7 days.');
  });

  it("names PyPI's month, the one its downloads are counted over", () => {
    const frame = (downloadsThrough?: string) =>
      visibleText(
        renderToStaticMarkup(
          <PackageRankingFrame registry="pypi" order="downloads" downloadsThrough={downloadsThrough}>
            {null}
          </PackageRankingFrame>,
        ),
      );
    expect(frame('2026-10-31T00:00:00.000Z')).toContain('Rank is based on PyPI downloads in October 2026.');
    expect(frame()).toContain('Rank is based on PyPI downloads in the last whole month.');
    expect(frame()).toContain('in their own requirements.txt or pyproject.toml.');
  });
});

describe('the PyPI downloads ranking', () => {
  it('says monthly downloads and the month before, where npm says weekly and last week', () => {
    const html = renderToStaticMarkup(
      <PackageRankingScreen
        registry="pypi"
        registryLabel="PyPI"
        order="downloads"
        page={1}
        rows={downloadsRanking}
        facts={{ ...packageRankingFacts, downloadsThrough: '2026-10-31T00:00:00.000Z' }}
      />,
    );
    const text = visibleText(html);

    expect(text).toContain('Monthly downloads');
    expect(text).toContain('vs the month before');
    expect(text).not.toContain('Weekly downloads');
    expect(text).not.toContain('vs last week');
    expect(text).toContain('By monthly downloads, the top three are');
    expect(text).toContain('Which PyPI package is first by monthly downloads?');
    expect(text).toContain('moss-date, with 5,806,310 downloads in October 2026.');
    expect(text).toContain('Rank is based on PyPI downloads in October 2026.');
    expect(html).toContain('href="/package/pypi/moss-date"');
  });
});

describe('the dependents ranking', () => {
  it("says the read's date, not the downloads' days", () => {
    const text = visibleText(
      renderToStaticMarkup(
        <PackageRankingScreen
          {...PAGE}
          order="dependents"
          page={1}
          rows={downloadsRanking}
          facts={packageRankingFacts}
        />,
      ),
    );
    expect(text).toContain('Only npm, only direct dependents, read November 16, 2026. ');
    expect(text).not.toContain('downloads to');
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
    expect(text).toContain(
      'Only npm, only direct dependents, downloads to November 15, 2026. Ranks as of November 17, 2026.',
    );
    expect(text).toContain('moss-date, with 5,806,310 downloads in the 7 days to November 15, 2026.');
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
