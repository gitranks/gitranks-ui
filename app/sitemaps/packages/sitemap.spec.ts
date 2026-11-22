import { beforeEach, describe, expect, it, vi } from 'vitest';

import sitemap, { generateSitemaps } from './sitemap';
import { fetchPackagesForSitemap } from '@/lib/sitemap/package-sitemap-data';
import { PackageRegistry } from '@/types/generated/graphql';

vi.mock('@/lib/sitemap/package-sitemap-data', () => ({ fetchPackagesForSitemap: vi.fn() }));

const part = (id: string) => sitemap({ id: Promise.resolve(id) });

describe('package-page sitemap', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
    vi.mocked(fetchPackagesForSitemap).mockReset().mockResolvedValue([]);
  });

  it('has ten parts a registry, in the table’s order: npm 0–9, PyPI 10–19, … Maven Central 60–69', async () => {
    expect(await generateSitemaps()).toHaveLength(70);
  });

  it("lists each of the new registries' pages under its own parts, at their address", async () => {
    vi.mocked(fetchPackagesForSitemap).mockResolvedValue(['github.com/gin-gonic/gin']);
    expect((await part('20')).map(({ url }) => url)).toEqual([
      'https://example.test/package/go/github.com/gin-gonic/gin',
    ]);
    expect(fetchPackagesForSitemap).toHaveBeenLastCalledWith(PackageRegistry.Go, 0);

    vi.mocked(fetchPackagesForSitemap).mockResolvedValue(['org.slf4j:slf4j-api']);
    expect((await part('63')).map(({ url }) => url)).toEqual([
      'https://example.test/package/maven/org.slf4j/slf4j-api',
    ]);
    expect(fetchPackagesForSitemap).toHaveBeenLastCalledWith(PackageRegistry.Maven, 3);

    vi.mocked(fetchPackagesForSitemap).mockResolvedValue(['laravel/framework']);
    expect((await part('50')).map(({ url }) => url)).toEqual([
      'https://example.test/package/packagist/laravel/framework',
    ]);
    expect(fetchPackagesForSitemap).toHaveBeenLastCalledWith(PackageRegistry.Packagist, 0);
  });

  it("lists each package's page at its canonical address, a scoped name as @scope/name", async () => {
    vi.mocked(fetchPackagesForSitemap).mockResolvedValue(['react', '@types/node']);

    expect((await part('1')).map(({ url }) => url)).toEqual([
      'https://example.test/package/npm/react',
      'https://example.test/package/npm/@types/node',
    ]);
    expect(fetchPackagesForSitemap).toHaveBeenCalledWith(PackageRegistry.Npm, 1);
  });

  it('pins the entries of a part', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-18T12:00:00Z'), toFake: ['Date'] });
    vi.mocked(fetchPackagesForSitemap).mockResolvedValue(['react', '@types/node']);

    expect(await part('0')).toMatchInlineSnapshot(`
      [
        {
          "changeFrequency": "monthly",
          "lastModified": "2026-11-01T00:00:00.000Z",
          "priority": 0.7,
          "url": "https://example.test/package/npm/react",
        },
        {
          "changeFrequency": "monthly",
          "lastModified": "2026-11-01T00:00:00.000Z",
          "priority": 0.7,
          "url": "https://example.test/package/npm/@types/node",
        },
      ]
    `);
    vi.useRealTimers();
  });

  it("lists a PyPI project's page under its registry, from the parts after npm's", async () => {
    vi.mocked(fetchPackagesForSitemap).mockResolvedValue(['zope-interface']);

    expect((await part('12')).map(({ url }) => url)).toEqual(['https://example.test/package/pypi/zope-interface']);
    expect(fetchPackagesForSitemap).toHaveBeenCalledWith(PackageRegistry.Pypi, 2);
  });

  it('reads no part outside 0–69', async () => {
    expect(await part('70')).toEqual([]);
    expect(await part('x')).toEqual([]);
    expect(fetchPackagesForSitemap).not.toHaveBeenCalled();
  });
});
