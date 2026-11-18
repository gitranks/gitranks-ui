import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bigRepo, repoLanguages, repoRankTiers } from '../../../__fixtures__/repo';
import { RepoOverviewSections } from '../../../components/repo-overview-sections';
import { RepoOverviewScreen } from './repo-overview-screen';
import { firstPage, onePackage, threePackages } from '@/components/dependents/dependents.fixtures';

vi.mock('next/navigation', () => ({ usePathname: () => '/repo/nebula/ui', useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: Date.parse('2026-10-28T12:00:00Z') });
});
afterEach(() => {
  vi.useRealTimers();
});

const text = (html: string) =>
  html
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// React's generated ids name a place in the tree, which a part rendered on its own does not share.
const render = (element: Parameters<typeof renderToStaticMarkup>[0]) =>
  renderToStaticMarkup(element).replace(/_R_[0-9a-z]+_/g, '_R_');

const screen = (props: Partial<Parameters<typeof RepoOverviewScreen>[0]> = {}) =>
  render(
    <RepoOverviewScreen
      repo={bigRepo}
      languages={repoLanguages}
      tiers={repoRankTiers}
      packages={threePackages}
      dependents={{ ...firstPage, items: firstPage.items.slice(0, 5) }}
      {...props}
    />,
  );

describe('RepoOverviewScreen', () => {
  it("draws today's overview sections, then the Used by card with five rows, as the board does", () => {
    const html = screen();
    const sections = render(<RepoOverviewSections repo={bigRepo} languages={repoLanguages} tiers={repoRankTiers} />);

    expect(html).toContain(sections);
    expect(html.indexOf(sections)).toBeLessThan(html.indexOf('<h2>Used by</h2>'));
    expect(text(html)).toContain(
      'Used by 231 repositories with 100+ stars depend on its 3 npm packages, 527k downloads a week. All 231',
    );
    expect(html).toContain('href="/repo/nebula/ui/used-by"');
    expect(html.match(/<tr /g)).toHaveLength(6);
    expect(html).not.toContain('>Uses<');
    expect(html).not.toContain('Show more');
  });

  it('names its only package', () => {
    expect(text(screen({ packages: onePackage }))).toContain(
      'depend on its npm package @nebula/ui, 413k downloads a week',
    );
  });

  it('leaves the card out without packages, without a dependent and while package data cannot be read', () => {
    for (const props of [
      { packages: null, dependents: null },
      { packages: { ...threePackages, dependents: 0 }, dependents: null },
      { packages: 'unavailable' as const, dependents: null },
      { dependents: 'unavailable' as const },
    ]) {
      expect(screen(props)).not.toContain('Used by');
    }
  });

  it('keeps the JSON-LD of the repository page', () => {
    expect(screen()).toContain('"@type":"SoftwareSourceCode"');
  });
});
