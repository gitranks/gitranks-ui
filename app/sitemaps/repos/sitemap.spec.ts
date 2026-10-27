import { beforeEach, describe, expect, it, vi } from 'vitest';

import sitemap from './sitemap';
import { fetchReposForSitemap } from '@/graphql/helpers/fetch-repo-sitemap-parts';

vi.mock('@/graphql/helpers/fetch-repo-sitemap-parts', () => ({ fetchReposForSitemap: vi.fn() }));

describe('repository sitemap', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
    vi.mocked(fetchReposForSitemap).mockReset();
  });

  it("lists each repository's page with the badges it shows", async () => {
    vi.mocked(fetchReposForSitemap).mockResolvedValue(['vercel/next.js']);

    const entries = await sitemap({ id: Promise.resolve('0') });

    expect(entries.map(({ url, images }) => ({ url, images }))).toEqual([
      {
        url: 'https://example.test/repo/vercel/next.js',
        images: [
          'https://example.test/badge/repo/vercel/next.js/rank.svg?theme=light',
          'https://example.test/badge/repo/vercel/next.js/star-history.svg?theme=light',
        ],
      },
    ]);
  });
});
