import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A registry in the table but not on the site's list (Maven Central, NuGet and RubyGems, for now): nothing a visitor
// reaches names it, its addresses are not found, and the API can still expire its pages' cache before it goes live.

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

describe('a registry in the table that the site does not list yet: Maven Central', () => {
  beforeEach(() => {
    revalidateTag.mockReset();
    vi.stubEnv('INTERNAL_JWT_SECRET', SECRET);
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('is not listed, nor are NuGet and RubyGems', () => {
    expect(REGISTRY_IDS).not.toContain('maven');
    expect(REGISTRY_IDS).not.toContain('nuget');
    expect(REGISTRY_IDS).not.toContain('rubygems');
    expect(registryLabelList()).toBe('npm, PyPI, Go, crates.io, pub.dev and Packagist');
  });

  it("answers its package and ranking addresses as not found, and its badges' as no package", () => {
    expect(parsePackageParams('maven', ['com.google.guava:guava'])).toBeNull();
    expect(isImpossibleEntityPath('/package/maven/com.google.guava:guava')).toBe(true);
    expect(isImpossibleEntityPath('/package/maven/com.google.guava:guava/facts.md')).toBe(true);
    expect(isInvalidRankingPath('/packages/maven/dependents-stars/1')).toBe(true);
    expect(isInvalidRankingPath('/packages/maven')).toBe(true);
    expect(parsePackageRef('maven', ['com.google.guava:guava'])).toBeNull();
    expect(parsePackageParams('nuget', ['newtonsoft.json'])).toBeNull();
    expect(isImpossibleEntityPath('/package/nuget/newtonsoft.json')).toBe(true);
    expect(isInvalidRankingPath('/packages/nuget/dependents-stars/1')).toBe(true);
    expect(parsePackageRef('nuget', ['newtonsoft.json'])).toBeNull();
    expect(parsePackageParams('rubygems', ['rails'])).toBeNull();
    expect(isImpossibleEntityPath('/package/rubygems/rails')).toBe(true);
    expect(isInvalidRankingPath('/packages/rubygems/dependents-stars/1')).toBe(true);
    expect(parsePackageRef('rubygems', ['rails'])).toBeNull();
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
    expect(frame).not.toContain('/packages/maven/');
    expect(frame).not.toContain('/packages/nuget/');
    expect(frame).not.toContain('/packages/rubygems/');

    return generateSitemaps().then((parts) => {
      expect(parts).toHaveLength(60);
      expect(packageSitemapPartOf(60)).toBeNull();
      const llms = llmsTxtOf({ contribute: false });
      expect(llms).not.toContain('/package/maven/');
      expect(llms).not.toContain('Maven Central');
      expect(llms).not.toContain('NuGet');
      expect(llms).not.toContain('RubyGems');
    });
  });

  it("is not looked up by the badge builder's search, nor read from a pasted address", () => {
    expect(parsePackageSearch('https://central.sonatype.com/artifact/com.google.guava/guava')).toBeNull();
    expect(parsePackageSearch('maven:com.google.guava:guava')).toBeNull();
    expect(searchLookups('com.google.guava:guava', 'package')).toEqual([]);
    expect(parsePackageSearch('https://www.nuget.org/packages/Newtonsoft.Json')).toBeNull();
    expect(parsePackageSearch('nuget:Serilog')).toBeNull();
    expect(searchLookups('<PackageReference Include="Serilog" />', 'package')).toEqual([]);
    expect(parsePackageSearch('https://rubygems.org/gems/rails')).toBeNull();
    expect(parsePackageSearch('rubygems:rails')).toBeNull();
    expect(searchLookups("gem 'rails', '~> 7.1'", 'package')).toEqual([]);
  });

  it('still has its cache tags accepted by the expire route, so its pages can be cleared before it goes live', async () => {
    const token = jwt.sign({ source: 'gitranks' }, SECRET, { expiresIn: '5m' });
    const response = await POST(
      new NextRequest('https://gitranks.com/api/cache/expire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tags: [
            'package:maven/com.google.guava:guava',
            'package:crates/serde-json',
            'package:nuget/newtonsoft.json',
            'package:rubygems/zentest',
          ],
        }),
      }),
    );

    expect(response.status).toBe(200);
    // crates.io's other spelling is expired as its folded tag, as the pages carry it.
    expect(revalidateTag.mock.calls.map(([tag]) => tag)).toEqual([
      'package:maven/com.google.guava:guava',
      'package:crates/serde_json',
      'package:nuget/newtonsoft.json',
      'package:rubygems/zentest',
    ]);
  });
});
