import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { rankedPackage } from '@/app/package/[registry]/[...name]/__fixtures__/package';
import { PackageScreen } from '@/app/package/[registry]/[...name]/components/package-screen';
import { buildPackageSEO, packageTitle } from '@/app/package/[registry]/[...name]/seo';
import { buildPackageSummary } from '@/app/package/[registry]/[...name]/utils/package-summary';
import { packageRankingFirstOrder, packageRankingOrdersOf } from '@/app/packages/package-rankings';
import { UsedByScreen } from '@/app/repo/[owner]/[name]/(tabs)/used-by/components/used-by-screen';
import { usedByCardLine } from '@/app/repo/[owner]/[name]/utils/used-by-summary';
import { availabilityOf, findBadge } from '@/badge/v3/catalogue';
import type { PackageFacts } from '@/badge/v3/facts';
import { NOW, packagePypi } from '@/badge/v3/fixtures';
import { resolveParams } from '@/badge/v3/params';
import { firstPage, onePackage } from '@/components/dependents/dependents.fixtures';
import type { PackagePage } from '@/graphql/package-page';
import type { RepoPackage } from '@/graphql/repo-packages';
import { packageMarkdownOf } from '@/lib/packages/package-markdown';
import { downloadsUnitOf, isRegistryId, REGISTRIES, registryHasDownloads } from '@/lib/packages/registries';
import { isInvalidRankingPath } from '@/lib/routing/ranking-routes';
import { llmsTxtOf } from '@/lib/seo/llms-txt';

vi.mock('@/components/header/header', () => ({ Header: () => null }));
vi.mock('@/components/package-follow/follow-slot', () => ({ FollowSlot: () => null }));
vi.mock('@/app/package/[registry]/[...name]/components/package-updates-button', () => ({
  PackageUpdatesButton: () => null,
}));
vi.mock('@/app/package/[registry]/[...name]/components/package-badge-section', () => ({
  PackageBadgeSection: () => null,
}));
vi.mock('@/app/package/[registry]/[...name]/components/downloads-chart', () => ({ default: () => null }));
vi.mock('next/navigation', () => ({ usePathname: () => '/x', useRouter: () => ({ push: vi.fn() }) }));

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();

// A pub.dev package as the API may answer it, its downloads and a downloads rank included: the site still shows none.
const pubPackage: PackagePage = {
  ...rankedPackage,
  registry: 'PUB',
  name: 'http',
  ranks: { downloads: { rank: 3 }, dependentsStars: { rank: 1 }, dependents: { rank: 2 } },
};

describe("pub.dev before its first month's download count is read", () => {
  it('is listed, counting downloads by the month, yet shown as a registry without them', () => {
    expect(isRegistryId('pub')).toBe(true);
    expect(REGISTRIES.pub.downloads).toBe('month');
    expect(downloadsUnitOf('pub')).toBeNull();
    expect(registryHasDownloads('pub')).toBe(false);
  });

  it('has no downloads ranking: its rankings open on dependents’ stars, and its downloads address is not found', () => {
    expect(packageRankingOrdersOf('pub')).toEqual(['dependents-stars', 'dependents']);
    expect(packageRankingFirstOrder('pub')).toBe('dependents-stars');
    expect(isInvalidRankingPath('/packages/pub/downloads/1')).toBe(true);
    expect(isInvalidRankingPath('/packages/pub/dependents-stars/1')).toBe(false);
    expect(isInvalidRankingPath('/packages/pub/dependents/1')).toBe(false);
  });

  it("titles a package's page without downloads, and describes it without them", () => {
    expect(packageTitle('http', 'pub')).toBe('http - pub.dev package dependents and ranks');
    const { metadata } = buildPackageSEO(pubPackage, 'http', [], 'pub');
    expect(metadata.title).toBe('http - pub.dev package dependents and ranks');
    expect(metadata.description).not.toMatch(/download/i);
    expect(metadata.description).toContain("pub.dev rank #1 by dependents' stars, #2 by dependents.");
  });

  it('draws a package page that says nothing of downloads, linking to the package on pub.dev', () => {
    const html = renderToStaticMarkup(<PackageScreen registry="pub" name="http" pkg={pubPackage} />);
    const page = text(html);

    expect(page).not.toMatch(/download/i);
    expect(page).toContain('Ranks on pub.dev Beta All ranks #1 Dependents’ stars #2 Dependents Used by');
    expect(html).toContain('aria-label="Open on pub.dev"');
    expect(html).toContain('href="https://pub.dev/packages/http"');
    expect(page).toContain('pubspec.yaml');
    const summary = buildPackageSummary('pub', pubPackage)
      .map((part) => (typeof part === 'string' ? part : part.text))
      .join('');
    expect(summary).toMatch(/^http is a pub\.dev package\. /);
  });

  it('writes facts in markdown with no downloads line, and never that pub.dev publishes no counts', () => {
    const markdown = packageMarkdownOf(pubPackage, 'pub');
    expect(markdown).not.toMatch(/download/i);
    expect(markdown).toContain('pubspec.yaml');
  });

  it("says nothing of downloads on a repository's Used by tab when its packages are on pub.dev alone", () => {
    const pkg: RepoPackage = {
      registry: 'PUB',
      name: 'http',
      dependents: 214,
      downloadsLastWeek: null,
      downloadsLastMonth: 1_200_000,
    };
    const packages = { ...onePackage, items: [pkg], downloadsLastWeek: 0, downloadsLastMonth: 1_200_000 };
    const page = text(
      renderToStaticMarkup(<UsedByScreen nameWithOwner="dart-lang/http" packages={packages} firstPage={firstPage} />),
    );
    expect(page).toContain("Forks, lockfiles and example folders don't count. Read monthly.");
    expect(page).not.toMatch(/download/i);
    // The Overview's line ends after the packages.
    const line = usedByCardLine(packages);
    expect(line.downloads).toBeNull();
    expect(line.downloadsLastMonth).toBeUndefined();
    expect(line.what).toMatch(/\.$/);
  });

  it('offers no downloads badge for a pub.dev package, its counts read or not', () => {
    const pub: PackageFacts = { ...packagePypi, registry: 'pub', name: 'http' };
    for (const id of ['downloads', 'downloads-year', 'downloads-growth', 'downloads-per-star', 'downloads-card']) {
      const badge = findBadge('package', id);
      if (!badge) throw new Error(`no package ${id}`);
      expect(availabilityOf(pub, id, resolveParams(badge, new URLSearchParams()), NOW), id).toBe('never');
    }
  });

  it('lists its rankings in llms.txt by dependents alone, saying nothing of its downloads', () => {
    const llms = llmsTxtOf({ contribute: false });
    const lines = llms.split('\n').filter((line) => line.includes('/pub/'));
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(
      /^- \[pub\.dev package rankings\]\(\S*\/packages\/pub\/dependents-stars\/1\): pub\.dev packages ranked by the stars of the repositories that use them, and by how many do\. Beta\.$/,
    );
    for (const line of lines) expect(line).not.toMatch(/download/i);
  });
});
