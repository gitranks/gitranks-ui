import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A registry in the table but not on the site's list (RubyGems, for now): nothing a visitor reaches names it, its
// addresses are not found, and the API can still expire its pages' cache before it goes live.

const { revalidateTag } = vi.hoisted(() => ({ revalidateTag: vi.fn() }));
vi.mock('next/cache', () => ({ revalidateTag, cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/sitemap/package-sitemap-data', () => ({
  fetchPackagesForSitemap: vi.fn(),
  fetchPackageSitemapParts: vi.fn(),
}));
vi.mock('@/components/header/header', () => ({ Header: () => null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { POST } = await import('@/app/api/cache/expire/route');
const { searchLookups, parsePackageSearch } = await import('@/app/badge/builder/[[...login]]/utils/builder-state');
const { parsePackageParams } = await import('@/app/package/[registry]/[...name]/utils/package-params');
const { PackageRankingFrame } = await import('@/app/packages/components/package-ranking-view');
const { generateSitemaps } = await import('@/app/sitemaps/packages/sitemap');
const { parsePackageRef } = await import('@/badge/v3/route');
const { REGISTRY_IDS, registryLabelList } = await import('@/lib/packages/registries');
const { isImpossibleEntityPath } = await import('@/lib/routing/entity-routes');
const { isInvalidRankingPath } = await import('@/lib/routing/ranking-routes');
const { llmsTxtOf } = await import('@/lib/seo/llms-txt');
const { packageSitemapPartOf } = await import('@/lib/sitemap/sitemap.consts');

const SECRET = 'spec-secret';

describe('a registry in the table that the site does not list yet: RubyGems', () => {
  beforeEach(() => {
    revalidateTag.mockReset();
    vi.stubEnv('INTERNAL_JWT_SECRET', SECRET);
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('is not listed', () => {
    expect(REGISTRY_IDS).not.toContain('rubygems');
    expect(registryLabelList()).toBe('npm, PyPI, Go, crates.io, pub.dev, Packagist, Maven Central and NuGet');
  });

  it("answers its package and ranking addresses as not found, and its badges' as no package", () => {
    expect(parsePackageParams('rubygems', ['rails'])).toBeNull();
    expect(parsePackageParams('rubygems', ['ZenTest'])).toBeNull();
    expect(isImpossibleEntityPath('/package/rubygems/rails')).toBe(true);
    expect(isImpossibleEntityPath('/package/rubygems/ZenTest')).toBe(true);
    expect(isImpossibleEntityPath('/package/rubygems/rails/facts.md')).toBe(true);
    expect(isInvalidRankingPath('/packages/rubygems/dependents-stars/1')).toBe(true);
    expect(isInvalidRankingPath('/packages/rubygems')).toBe(true);
    expect(parsePackageRef('rubygems', ['rails'])).toBeNull();
    expect(parsePackageRef('rubygems', ['ZenTest'])).toBeNull();
  });

  it('is missing from the registry switch, the sitemaps and llms.txt', () => {
    const frame = renderToStaticMarkup(
      <PackageRankingFrame registry="npm" order="dependents">
        {null}
      </PackageRankingFrame>,
    );
    expect(frame).toContain('href="/packages/pypi/dependents/1"');
    expect(frame).toContain('href="/packages/go/dependents/1"');
    expect(frame).toContain('href="/packages/crates/dependents/1"');
    expect(frame).toContain('href="/packages/pub/dependents/1"');
    expect(frame).toContain('href="/packages/packagist/dependents/1"');
    expect(frame).toContain('href="/packages/maven/dependents/1"');
    expect(frame).toContain('href="/packages/nuget/dependents/1"');
    expect(frame).not.toContain('/packages/rubygems/');

    return generateSitemaps().then((parts) => {
      expect(parts).toHaveLength(80);
      expect(packageSitemapPartOf(80)).toBeNull();
      const llms = llmsTxtOf({ contribute: false });
      expect(llms).not.toContain('/package/rubygems/');
      expect(llms).not.toContain('RubyGems');
    });
  });

  it("is not looked up by the badge builder's search, nor read from a pasted address", () => {
    expect(parsePackageSearch('https://rubygems.org/gems/rails')).toBeNull();
    expect(parsePackageSearch('https://rubygems.org/gems/rails/versions/7.1.0')).toBeNull();
    // `rubygems:` is RubyGems' own spelling, never read as a Maven Central `groupId:artifactId` or a NuGet id while
    // RubyGems is not listed.
    expect(parsePackageSearch('rubygems:rails')).toBeNull();
    expect(parsePackageSearch('rubygems:ZenTest')).toBeNull();
    expect(searchLookups('rubygems:rails', 'package')).toEqual([]);
    expect(searchLookups("gem 'rails', '~> 7.1'", 'package')).toEqual([]);
    expect(searchLookups('gem "ZenTest"', 'package')).toEqual([]);
    expect(searchLookups('spec.add_dependency "rack", ">= 2"', 'package')).toEqual([]);
  });

  it('still has its cache tags accepted by the expire route, so its pages can be cleared before it goes live', async () => {
    const token = jwt.sign({ source: 'gitranks' }, SECRET, { expiresIn: '5m' });
    const response = await POST(
      new NextRequest('https://gitranks.com/api/cache/expire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tags: ['package:rubygems/zentest', 'package:crates/serde-json', 'package:rubygems/rails'],
        }),
      }),
    );

    expect(response.status).toBe(200);
    // crates.io's other spelling is expired as its folded tag, as the pages carry it.
    expect(revalidateTag.mock.calls.map(([tag]) => tag)).toEqual([
      'package:rubygems/zentest',
      'package:crates/serde_json',
      'package:rubygems/rails',
    ]);
  });
});
