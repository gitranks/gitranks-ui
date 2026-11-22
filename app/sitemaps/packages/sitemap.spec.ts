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

  it('has ten parts a registry: npm 0–9, PyPI 10–19, Go 20–29, crates.io 30–39, pub.dev 40–49', async () => {
    expect(await generateSitemaps()).toHaveLength(50);
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

  it("lists a Go module's page under its registry, its path kept as written, from the parts after PyPI's", async () => {
    vi.mocked(fetchPackagesForSitemap).mockResolvedValue(['github.com/BurntSushi/toml']);

    expect((await part('23')).map(({ url }) => url)).toEqual([
      'https://example.test/package/go/github.com/BurntSushi/toml',
    ]);
    expect(fetchPackagesForSitemap).toHaveBeenCalledWith(PackageRegistry.Go, 3);
  });

  it("lists a crate's page under its registry, from the parts after Go's", async () => {
    vi.mocked(fetchPackagesForSitemap).mockResolvedValue(['serde_json']);

    expect((await part('34')).map(({ url }) => url)).toEqual(['https://example.test/package/crates/serde_json']);
    expect(fetchPackagesForSitemap).toHaveBeenCalledWith(PackageRegistry.Crates, 4);
  });

  it("lists a pub.dev package's page under its registry, from the parts after crates.io's", async () => {
    vi.mocked(fetchPackagesForSitemap).mockResolvedValue(['shared_preferences']);

    expect((await part('45')).map(({ url }) => url)).toEqual(['https://example.test/package/pub/shared_preferences']);
    expect(fetchPackagesForSitemap).toHaveBeenCalledWith(PackageRegistry.Pub, 5);
  });

  it('reads no part outside 0–49', async () => {
    expect(await part('50')).toEqual([]);
    expect(await part('x')).toEqual([]);
    expect(fetchPackagesForSitemap).not.toHaveBeenCalled();
  });
});
