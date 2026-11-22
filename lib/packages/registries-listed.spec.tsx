import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// A registry in the table but not on the site's list (Go, for now): nothing a visitor reaches names it, its addresses
// are not found, and the API can still expire its pages' cache before it goes live.

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

describe('a registry in the table that the site does not list yet: Go', () => {
  beforeEach(() => {
    revalidateTag.mockReset();
    vi.stubEnv('INTERNAL_JWT_SECRET', SECRET);
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('is not listed', () => {
    expect(REGISTRY_IDS).not.toContain('go');
    expect(registryLabelList()).toBe('npm and PyPI');
  });

  it("answers its package and ranking addresses as not found, and its badges' as no package", () => {
    expect(parsePackageParams('go', ['github.com', 'gin-gonic', 'gin'])).toBeNull();
    expect(isImpossibleEntityPath('/package/go/github.com/gin-gonic/gin')).toBe(true);
    expect(isImpossibleEntityPath('/package/go/github.com/gin-gonic/gin/facts.md')).toBe(true);
    expect(isInvalidRankingPath('/packages/go/dependents-stars/1')).toBe(true);
    expect(isInvalidRankingPath('/packages/go')).toBe(true);
    expect(parsePackageRef('go', ['github.com', 'gin-gonic', 'gin'])).toBeNull();
  });

  it('is missing from the registry switch, the sitemaps and llms.txt', () => {
    const frame = renderToStaticMarkup(
      <PackageRankingFrame registry="npm" order="dependents">
        {null}
      </PackageRankingFrame>,
    );
    expect(frame).toContain('href="/packages/pypi/dependents/1"');
    expect(frame).not.toContain('/packages/go/');

    return generateSitemaps().then((parts) => {
      expect(parts).toHaveLength(20);
      expect(packageSitemapPartOf(20)).toBeNull();
      const llms = llmsTxtOf({ contribute: false });
      expect(llms).not.toContain('/package/go/');
      expect(llms).not.toContain('Go package');
    });
  });

  it("is not looked up by the badge builder's search, nor read from a pasted address", () => {
    expect(parsePackageSearch('https://pkg.go.dev/github.com/gin-gonic/gin')).toBeNull();
    expect(parsePackageSearch('go:github.com/gin-gonic/gin')).toBeNull();
    expect(searchLookups('github.com/gin-gonic/gin', 'package')).toEqual([]);
  });

  it('still has its cache tags accepted by the expire route, so its pages can be cleared before it goes live', async () => {
    const token = jwt.sign({ source: 'gitranks' }, SECRET, { expiresIn: '5m' });
    const response = await POST(
      new NextRequest('https://gitranks.com/api/cache/expire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tags: ['package:go/github.com/gin-gonic/gin', 'package:crates/serde-json'] }),
      }),
    );

    expect(response.status).toBe(200);
    // crates.io's other spelling is expired as its folded tag, as the pages carry it.
    expect(revalidateTag.mock.calls.map(([tag]) => tag)).toEqual([
      'package:go/github.com/gin-gonic/gin',
      'package:crates/serde_json',
    ]);
  });
});
