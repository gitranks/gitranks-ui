import { beforeEach, describe, expect, it, vi } from 'vitest';

import sitemap, { generateSitemaps } from './sitemap';
import { fetchOrgsForSitemap } from '@/graphql/helpers/fetch-org-sitemap-parts';

vi.mock('@/graphql/helpers/fetch-org-sitemap-parts', () => ({ fetchOrgsForSitemap: vi.fn() }));

const part = (id: number | string) => sitemap({ id: Promise.resolve(String(id)) });

describe('organization-page sitemap', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
    vi.mocked(fetchOrgsForSitemap).mockReset();
  });

  it('can have five parts', async () => {
    expect(await generateSitemaps()).toEqual([0, 1, 2, 3, 4].map((id) => ({ id })));
  });

  it("lists each organization's page with the images it shows", async () => {
    vi.mocked(fetchOrgsForSitemap).mockResolvedValue(['vercel', 'a-b']);

    const entries = await part(1);

    expect(fetchOrgsForSitemap).toHaveBeenCalledWith(1);
    expect(entries.map(({ url, images }) => ({ url, images }))).toEqual([
      {
        url: 'https://example.test/org/vercel',
        images: [
          'https://example.test/api/avatar/vercel',
          'https://example.test/badge/org/vercel/rank.svg?theme=light',
          'https://example.test/badge/org/vercel/org-card.svg?theme=light',
        ],
      },
      {
        url: 'https://example.test/org/a-b',
        images: [
          'https://example.test/api/avatar/a-b',
          'https://example.test/badge/org/a-b/rank.svg?theme=light',
          'https://example.test/badge/org/a-b/org-card.svg?theme=light',
        ],
      },
    ]);
    expect(entries[0]).toMatchObject({ priority: 0.7, changeFrequency: 'monthly' });
  });

  it('is empty for a part past the most there can be or one that is not a number', async () => {
    for (const id of [5, -1, 'x', 1.5]) {
      expect(await part(id)).toEqual([]);
    }
    expect(fetchOrgsForSitemap).not.toHaveBeenCalled();
  });

  it('is empty when the part has no organizations', async () => {
    vi.mocked(fetchOrgsForSitemap).mockResolvedValue([]);

    expect(await part(0)).toEqual([]);
  });
});
