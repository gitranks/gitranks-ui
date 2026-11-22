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

  it('has ten parts', async () => {
    expect(await generateSitemaps()).toHaveLength(10);
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

  it('reads no part outside 0–9', async () => {
    expect(await part('10')).toEqual([]);
    expect(await part('x')).toEqual([]);
    expect(fetchPackagesForSitemap).not.toHaveBeenCalled();
  });
});
