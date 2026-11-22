import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { rankedPackage, spelledPackage } from '@/app/package/[registry]/[...name]/__fixtures__/package';
import { PackageScreen } from '@/app/package/[registry]/[...name]/components/package-screen';
import { buildPackageSEO } from '@/app/package/[registry]/[...name]/seo';
import { buildPackageSummary } from '@/app/package/[registry]/[...name]/utils/package-summary';
import { PackageCard } from '@/app/repo/[owner]/[name]/(tabs)/used-by/components/package-card';
import { PackagesTable } from '@/app/repo/[owner]/[name]/(tabs)/used-by/components/packages-table';
import {
  filterOptionsOf,
  followOf,
  withSpelledUses,
} from '@/app/repo/[owner]/[name]/(tabs)/used-by/components/used-by-list';
import { buildUsedBySEO } from '@/app/repo/[owner]/[name]/tab-seo';
import {
  buildUsedByQuestions,
  buildUsedBySummary,
  noDependentsTitle,
  usedByCardLine,
} from '@/app/repo/[owner]/[name]/utils/used-by-summary';
import { dependentRows, fivePackages, onePackage, threePackages } from '@/components/dependents/dependents.fixtures';
import type { FollowSlotProps } from '@/components/package-follow/follow-slot';
import type { RepoPackage, RepoPackages } from '@/graphql/repo-packages';
import { packageMarkdownOf } from '@/lib/packages/package-markdown';
import { spelledNameOf } from '@/lib/packages/registries';

vi.mock('@/components/header/header', () => ({ Header: () => null }));
vi.mock('@/components/package-follow/follow-slot', () => ({
  FollowSlot: (props: FollowSlotProps) => (
    <div data-follow={props.placement} data-label={props.label} data-keys={props.packages.map((p) => p.name).join()} />
  ),
}));
vi.mock('@/app/package/[registry]/[...name]/components/package-updates-button', () => ({
  PackageUpdatesButton: (props: { name: string; spelledName?: string }) => (
    <div data-updates={props.name} data-spelled={props.spelledName ?? ''} />
  ),
}));
vi.mock('@/app/package/[registry]/[...name]/components/package-badge-section', () => ({
  PackageBadgeSection: (props: { name: string }) => <div data-badges={props.name} />,
}));
vi.mock('@/app/package/[registry]/[...name]/components/downloads-chart', () => ({ default: () => null }));
vi.mock('next/navigation', () => ({ usePathname: () => '/package/npm/x', useRouter: () => ({ push: vi.fn() }) }));

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replace(/\s+/g, ' ')
    .trim();
const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map(([, href]) => href);
const summaryText = (parts: readonly (string | { text: string })[]) =>
  parts.map((part) => (typeof part === 'string' ? part : part.text)).join('');

/**
 * One of a repository's packages on PyPI, which folds names, written by it otherwise than its address. A repository's
 * packages carry last week's downloads alone, and PyPI has no week.
 */
const zope: RepoPackage = {
  registry: 'PYPI',
  name: 'zope-interface',
  displayName: 'zope.interface',
  dependents: 40,
  downloadsLastWeek: null,
};
const withZope = (packages: RepoPackages): RepoPackages => ({ ...packages, items: [zope, ...packages.items.slice(1)] });

describe("a package's name as the registry writes it", () => {
  it('is the display name when the API answers one, else the name', () => {
    expect(spelledNameOf({ name: 'zope-interface', displayName: 'zope.interface' })).toBe('zope.interface');
    expect(spelledNameOf({ name: 'react', displayName: 'react' })).toBe('react');
    expect(spelledNameOf({ name: 'react', displayName: null })).toBe('react');
    expect(spelledNameOf({ name: 'react' })).toBe('react');
  });

  it('leaves an npm package page as it was, whether the display name is the name, null or missing', () => {
    const page = (pkg: typeof rankedPackage) =>
      renderToStaticMarkup(<PackageScreen registry="npm" name="react-resize-detector" pkg={pkg} jsonLd={[{}]} />);
    const before = page(rankedPackage);
    expect(page({ ...rankedPackage, displayName: 'react-resize-detector' })).toBe(before);
    expect(page({ ...rankedPackage, displayName: null })).toBe(before);

    const seo = buildPackageSEO(rankedPackage, 'react-resize-detector', [], 'npm');
    expect(
      buildPackageSEO({ ...rankedPackage, displayName: 'react-resize-detector' }, 'react-resize-detector', [], 'npm'),
    ).toEqual(seo);
    expect(packageMarkdownOf({ ...rankedPackage, displayName: 'react-resize-detector' }, 'npm')).toBe(
      packageMarkdownOf(rankedPackage, 'npm'),
    );
  });

  it('titles the page of a package on a registry that folds names with its display name, and keeps its name for links, follows, refreshes and badges', () => {
    const html = renderToStaticMarkup(
      <PackageScreen registry="pypi" name="zope-interface" pkg={spelledPackage} jsonLd={[{}]} />,
    );
    const page = text(html);

    expect(html).toMatch(/<h1[^>]*>zope\.interface<\/h1>/);
    expect(page).toContain('zope.interface is a PyPI package downloaded');
    expect(page).toContain('About zope.interface');
    expect(page).toContain('direct dependents, in their own requirements.txt or pyproject.toml');
    expect(page).not.toContain('zope-interface');
    expect(html).toContain('data-follow="package-page" data-label="zope.interface" data-keys="zope-interface"');
    expect(html).toContain('data-updates="zope-interface" data-spelled="zope.interface"');
    expect(html).toContain('data-badges="zope-interface"');
    expect(hrefs(html)).toContain('https://pypi.org/project/zope-interface/');

    const empty = renderToStaticMarkup(
      <PackageScreen
        registry="pypi"
        name="zope-interface"
        pkg={{ ...spelledPackage, dependentsCount: 0, dependents: { total: 0, archived: 0, items: [] } }}
      />,
    );
    expect(text(empty)).toContain('No repository with 100+ stars uses zope.interface directly yet');
    expect(summaryText(buildPackageSummary('pypi', spelledPackage))).toMatch(/^zope\.interface is a PyPI package/);
  });

  it("writes the display name in the page's title and structured data, and the name in its addresses", () => {
    const { metadata, jsonLd } = buildPackageSEO(spelledPackage, 'zope-interface', dependentRows, 'pypi');
    const json = JSON.stringify(jsonLd);

    expect(metadata.title).toBe('zope.interface - PyPI package dependents, downloads and ranks');
    expect(metadata.alternates?.canonical).toBe('/package/pypi/zope-interface');
    expect(metadata.alternates?.types).toEqual({ 'text/markdown': '/package/pypi/zope-interface/facts.md' });
    expect(json).toContain('"name":"zope.interface","description"');
    expect(json).toContain('Repositories with 100+ stars that use zope.interface');
    expect(json).toContain('https://pypi.org/project/zope-interface/');
    expect(json).toContain('/package/pypi/zope-interface"');

    const markdown = packageMarkdownOf(spelledPackage, 'pypi');
    expect(markdown).toMatch(/^# zope\.interface \(PyPI package\)\n/);
    expect(markdown).toContain('/package/pypi/zope-interface\n');
    expect(markdown).toContain('- PyPI: https://pypi.org/project/zope-interface/\n');
  });

  it("shows a repository's package by its display name on the Used by tab, linked by its name", () => {
    const wide = renderToStaticMarkup(<PackageCard pkg={zope} wide />);
    expect(text(wide)).toMatch(/^zope\.interface The PyPI package/);
    expect(hrefs(wide)).toEqual(['/package/pypi/zope-interface']);
    expect(text(renderToStaticMarkup(<PackageCard pkg={zope} />))).toMatch(/^zope\.interface 40/);

    // Beside npm packages, each one names its registry.
    const table = renderToStaticMarkup(<PackagesTable packages={withZope(fivePackages)} />);
    expect(text(table)).toContain('zope.interface PyPI 40');
    expect(hrefs(table)).toContain('/package/pypi/zope-interface');

    const packages = withZope(threePackages).items;
    expect(filterOptionsOf(packages)[0]).toEqual({
      value: 'pypi/zope-interface',
      name: 'zope.interface',
      registryLabel: 'PyPI',
    });
    expect(followOf('zopefoundation/zope.interface', packages, 3, 'pypi/zope-interface')).toEqual({
      packages: [{ registry: 'pypi', name: 'zope-interface' }],
      label: 'zope.interface',
    });

    const rows = [{ ...dependentRows[0], uses: ['zope-interface', '@nebula/icons'] }];
    expect(withSpelledUses(rows, packages)[0].uses).toEqual(['zope.interface', '@nebula/icons']);
    // A name two packages share is left as it is.
    expect(withSpelledUses(rows, [...packages, { ...zope, displayName: 'Zope.Interface' }])[0].uses).toEqual(
      rows[0].uses,
    );
  });

  it("writes the display name in the Used by tab's sentences and description", () => {
    const one = withZope(onePackage);
    expect(usedByCardLine(one).what).toContain('its PyPI package zope.interface');
    expect(noDependentsTitle(one)).toBe('No repository with 100+ stars uses zope.interface directly yet');
    expect(summaryText(buildUsedBySummary('zopefoundation/zope.interface', one, []))).toContain(
      'publishes one PyPI package, zope.interface.',
    );
    expect(buildUsedByQuestions('zopefoundation/zope.interface', one, [])[0].answer).toContain(
      'its package zope.interface directly',
    );
    expect(buildUsedByQuestions('a/b', withZope(threePackages), [])[1].answer).toMatch(/^zope\.interface: 40/);

    const repo = { nameWithOwner: 'acme/zi', owner: 'acme', rank: null };
    const { metadata } = buildUsedBySEO(repo as Parameters<typeof buildUsedBySEO>[0], one, dependentRows);
    expect(metadata.description).toContain('depend on zope.interface.');
    expect(metadata.description).not.toContain('zope-interface');
  });
});
