import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { parsePackageSearch } from '@/app/badge/builder/[[...login]]/utils/builder-state';
import { parsePackageParams } from '@/app/package/[registry]/[...name]/utils/package-params';
import { PackageBetaNotice } from '@/app/packages/components/package-beta-notice';
import { PackageRankingFrame } from '@/app/packages/components/package-ranking-view';
import { packageRankingFirstOrder, packageRankingOrdersOf } from '@/app/packages/package-rankings';
import { PackageCard } from '@/app/repo/[owner]/[name]/(tabs)/used-by/components/package-card';
import { filterOptionsOf, followOf } from '@/app/repo/[owner]/[name]/(tabs)/used-by/components/used-by-list';
import { spansRegistries } from '@/app/repo/[owner]/[name]/utils/repo-package-registry';
import { noDependentsNote, usedByCardLine } from '@/app/repo/[owner]/[name]/utils/used-by-summary';
import { availabilityOf, findBadge } from '@/badge/v3/catalogue';
import { packageBig } from '@/badge/v3/fixtures';
import { resolveParams } from '@/badge/v3/params';
import type { RepoPackage } from '@/graphql/repo-packages';
import { packageCacheTag, packageMarkdownRewriteOf } from '@/lib/packages/package-paths';
import { type RegistryId, registryLabelList } from '@/lib/packages/registries';
import { isImpossibleEntityPath } from '@/lib/routing/entity-routes';
import { isInvalidRankingPath } from '@/lib/routing/ranking-routes';
import { packagePath } from '@/utils/package-paths';

// The site lists npm and PyPI. These checks add a third registry to the table, one with no download counts whose names
// take two segments joined by `:`, to show what the table drives for a registry unlike both: no downloads ranking or
// badges, two segments a name, and its own separator.

const { SECOND } = vi.hoisted(() => ({
  SECOND: {
    label: 'Maven Central',
    article: 'a',
    api: 'MAVEN',
    pageUrl: (name: string) => `https://registry.example/artifact/${name.replace(':', '/')}`,
    pageUrlPrefix: /^(?:https?:\/\/)?registry\.example\/artifact\//i,
    isName: (name: string) => /^[\w.-]+:[\w.-]+$/.test(name),
    canonicalName: (name: string) => name,
    nameMaxLength: 500,
    path: { min: 2, max: 2, join: ':' },
    downloads: null,
    manifest: 'pom.xml',
    examples: ['org.slf4j:slf4j-api'],
    nameHint: 'group:artifact',
  },
}));

vi.mock('@/lib/packages/registries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/packages/registries')>();
  (actual.REGISTRIES as Record<string, unknown>).maven = SECOND;
  actual.REGISTRY_IDS.push('maven' as RegistryId);
  return actual;
});
vi.mock('@/components/header/header', () => ({ Header: () => null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const maven = 'maven' as RegistryId;

describe('a third registry in the table', () => {
  it('reads its names from their segments, joined by its own separator, and writes them back', () => {
    expect(parsePackageParams('maven', ['org.slf4j', 'slf4j-api'])).toEqual({
      registry: 'maven',
      name: 'org.slf4j:slf4j-api',
    });
    expect(parsePackageParams('maven', ['org.slf4j'])).toBeNull();
    expect(packagePath('org.slf4j:slf4j-api', maven)).toBe('/package/maven/org.slf4j/slf4j-api');
    expect(isImpossibleEntityPath('/package/maven/org.slf4j/slf4j-api')).toBe(false);
    expect(isImpossibleEntityPath('/package/maven/slf4j-api')).toBe(true);
  });

  it("tags its pages' cache and answers its facts.md by its segments", () => {
    expect(packageCacheTag(maven, 'Org.SLF4J:slf4j-api')).toBe('package:maven/org.slf4j:slf4j-api');
    expect(packageMarkdownRewriteOf('/package/maven/org.slf4j/slf4j-api/facts.md')).toBe(
      '/api/packages/maven/org.slf4j/slf4j-api/facts.md',
    );
    expect(packageMarkdownRewriteOf('/package/maven/slf4j-api/facts.md')).toBeNull();
  });

  it('has no downloads ranking without download counts, and opens on dependents’ stars', () => {
    expect(packageRankingOrdersOf(maven)).toEqual(['dependents-stars', 'dependents']);
    expect(packageRankingFirstOrder(maven)).toBe('dependents-stars');
    expect(isInvalidRankingPath('/packages/maven/downloads/1')).toBe(true);
    expect(isInvalidRankingPath('/packages/maven/dependents-stars/1')).toBe(false);
    expect(isInvalidRankingPath('/packages/npm/downloads/1')).toBe(false);
  });

  it('shows the registry switch beside "Rank by", keeping the order where the other registry has it', () => {
    const npm = renderToStaticMarkup(
      <PackageRankingFrame registry="npm" order="downloads">
        <p>page</p>
      </PackageRankingFrame>,
    );
    expect(npm).toContain('Registry:');
    expect(npm).toContain('href="/packages/maven/dependents-stars/1"');
    expect(npm).toContain('href="/packages/npm/downloads/1"');
    expect(npm).toContain('href="/packages/pypi/downloads/1"');

    const second = renderToStaticMarkup(
      <PackageRankingFrame registry={maven} order="dependents">
        <p>page</p>
      </PackageRankingFrame>,
    );
    expect(second).toContain('href="/packages/npm/dependents/1"');
    expect(second).not.toContain('href="/packages/maven/downloads/1"');
  });

  it('names every listed registry in the Beta notice, and the files of the page’s own', () => {
    expect(registryLabelList()).toBe('npm, PyPI and Maven Central');
    expect(renderToStaticMarkup(<PackageBetaNotice />)).toContain('<b>npm, PyPI and Maven Central packages only</b>');
    expect(renderToStaticMarkup(<PackageBetaNotice />)).toContain(
      'in their own package.json, requirements.txt, pyproject.toml or pom.xml.',
    );
    expect(renderToStaticMarkup(<PackageBetaNotice registry={maven} />)).toContain('in their own pom.xml.');
  });

  it('offers no downloads badge for it', () => {
    const facts = { ...packageBig, registry: maven, name: 'org.slf4j:slf4j-api' };
    for (const id of ['downloads', 'downloads-year', 'downloads-growth', 'downloads-per-star', 'downloads-card']) {
      const badge = findBadge('package', id);
      expect(badge, id).not.toBeNull();
      if (badge) expect(availabilityOf(facts, id, resolveParams(badge, {})), id).toBe('never');
    }
    const usedBy = findBadge('package', 'used-by');
    if (usedBy) expect(availabilityOf(facts, 'used-by', resolveParams(usedBy, {}))).toBe('available');
  });

  it('takes its page address and `<registry>:` in the badge builder', () => {
    expect(parsePackageSearch('maven:org.slf4j:slf4j-api')).toBe('maven/org.slf4j:slf4j-api');
    expect(parsePackageSearch('https://registry.example/artifact/org.slf4j:slf4j-api')).toBe(
      'maven/org.slf4j:slf4j-api',
    );
    expect(parsePackageSearch('react')).toBe('npm/react');
  });

  it('keys the Used by filter and Follow by registry and name, so one name on two registries is two packages', () => {
    const onBoth = [
      { registry: 'NPM' as const, name: 'slf4j' },
      { registry: 'MAVEN' as RepoPackage['registry'], name: 'slf4j' },
    ];
    expect(filterOptionsOf(onBoth)).toEqual([
      { value: 'npm/slf4j', name: 'slf4j', registryLabel: 'npm' },
      { value: 'maven/slf4j', name: 'slf4j', registryLabel: 'Maven Central' },
    ]);
    expect(followOf('acme/slf4j', onBoth, 2, 'maven/slf4j').packages).toEqual([{ registry: 'maven', name: 'slf4j' }]);
    expect(filterOptionsOf([onBoth[0]])).toEqual([{ value: 'npm/slf4j', name: 'slf4j' }]);
  });

  it('says nothing about downloads on Used by for a registry without download counts', () => {
    const pkg: RepoPackage = {
      registry: 'MAVEN' as RepoPackage['registry'],
      name: 'org.slf4j:slf4j-api',
      dependents: 0,
      downloadsLastWeek: 0,
    };
    const packages = {
      total: 1,
      items: [pkg],
      dependents: 0,
      dependentsArchived: 0,
      downloadsLastWeek: 0,
      downloadsLastMonth: 0,
    };
    expect(renderToStaticMarkup(<PackageCard pkg={pkg} wide />)).not.toContain('downloads');
    expect(noDependentsNote(packages)).toBe('We read every repository with 100+ stars once a month.');
    expect(usedByCardLine(packages)).toMatchObject({ downloads: null });
    expect(usedByCardLine(packages).what).toMatch(/Maven Central package org\.slf4j:slf4j-api\.$/);
  });

  it("names each package's registry on a repository whose packages are on both", () => {
    const pkg: RepoPackage = {
      registry: 'MAVEN' as RepoPackage['registry'],
      name: 'org.slf4j:slf4j-api',
      dependents: 3,
      downloadsLastWeek: 0,
    };
    expect(spansRegistries([pkg, { ...pkg, registry: 'NPM', name: 'react' }])).toBe(true);
    expect(spansRegistries([{ ...pkg, registry: 'NPM' }])).toBe(false);
    const html = renderToStaticMarkup(<PackageCard pkg={pkg} registryChip />);
    expect(html).toContain('href="/package/maven/org.slf4j/slf4j-api"');
    expect(html).toContain('>Maven Central</span>');
  });
});
