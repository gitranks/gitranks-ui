import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { landingPackages } from './__fixtures__/packages';
import { PackagesSection } from './packages-section';

/** Markup's text as a visitor reads it: the character references React writes, turned back. */
const plain = (html: string) => html.replaceAll('&#x27;', "'").replaceAll('&amp;', '&');

describe("the home page's package block", () => {
  const html = plain(renderToStaticMarkup(<PackagesSection {...landingPackages} />));

  it('says what is new, how many npm packages are ranked, and the registries listed for now', () => {
    expect(html).toContain('aria-labelledby="packages"');
    expect(html).toContain('Package rankings');
    expect(html).toContain('The npm packages open source runs on');
    expect(html).toContain('41,870 npm packages, ranked by downloads');
    expect(html).toContain(
      'npm, PyPI, Go, crates.io, pub.dev, Packagist, Maven Central, NuGet and RubyGems for now. More registries are on the way.',
    );
    // The rows are npm's, by the week; the pitch names no unit while the registries count in different ones.
    expect(html).toContain('By downloads, by the stars of the repositories that use a package');
    expect(html).toContain('>Weekly downloads</span>');
  });

  it('has one call to action, into the package rankings', () => {
    expect(html.match(/href="\/packages"/g)).toHaveLength(1);
    expect(html).toContain('See package rankings');
  });

  it("tabs the three rankings in the rankings' own order, each with its top rows and its full ranking", () => {
    for (const tab of ['Downloads', "Dependents' stars", 'Dependents']) expect(html).toContain(`>${tab}</button>`);
    expect(html.indexOf('>Downloads</button>')).toBeLessThan(html.indexOf(">Dependents' stars</button>"));
    for (const by of ['downloads', 'dependents-stars', 'dependents']) {
      expect(html).toContain(`href="/packages/npm/${by}/1"`);
    }
    expect(html).toContain('href="/package/npm/moss-date"');
    expect(html).toContain('href="/package/npm/@orbit/fetch"');
    expect(html).toContain('Downloads in the 7 days to November 15, 2026');
  });

  it('shows at most five rows a ranking, numbers compact with the full number on hover', () => {
    const many = {
      ...landingPackages.boards[0],
      rows: [
        ...landingPackages.boards[0].rows,
        ...landingPackages.boards[0].rows.map((row) => ({ ...row, name: `${row.name}-2` })),
      ],
    };
    const one = renderToStaticMarkup(<PackagesSection boards={[many]} ranked={null} downloadsTo={null} />);
    expect(one.match(/<li class="flex items-center/g)).toHaveLength(5);
    expect(one).toContain('title="5,806,310">5.8M<');
    expect(plain(one)).toContain('npm packages, ranked by downloads');
    expect(one).toContain('Downloads over 7 days');
  });

  it('draws nothing with no ranking to show', () => {
    expect(renderToStaticMarkup(<PackagesSection boards={[]} ranked={1} downloadsTo={null} />)).toBe('');
  });
});
