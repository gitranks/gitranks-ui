import { beforeEach, describe, expect, it, vi } from 'vitest';

import sitemap from './sitemap';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

vi.mock('next/cache', () => ({ cacheLife: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect: vi.fn() }));

const imagesOf = async () => (await sitemap()).map(({ url, images }) => ({ url, images }));

describe('profile sitemap', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
    vi.mocked(graphqlDirect).mockReset();
    vi.mocked(graphqlDirect).mockResolvedValue({
      profilesForSitemap: [{ login: 'octocat', s: 150, c: 2, f: null }],
    });
  });

  it('lists the images the page shows: the avatar and the promoted badges', async () => {
    expect(await imagesOf()).toEqual([
      {
        url: 'https://example.test/profile/octocat',
        images: [
          'https://example.test/api/avatar/octocat',
          'https://example.test/badge/user/octocat/rank.svg?theme=light',
          'https://example.test/badge/user/octocat/profile-card.svg?theme=light',
        ],
      },
    ]);
  });
});
