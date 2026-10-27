import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
      profilesForSitemap: [{ login: 'octocat', s: 10, c: 2, f: null }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists old and new badge images until the cut-over', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-28T00:00:00.000Z'), toFake: ['Date'] });

    expect(await imagesOf()).toEqual([
      {
        url: 'https://example.test/profile/octocat',
        images: [
          'https://example.test/badge/user/octocat/profile-card.png',
          'https://example.test/badge/user/octocat/rank.png',
          'https://example.test/badges/octocat/stars-rank.png',
          'https://example.test/badges/octocat/stars-score.png',
        ],
      },
    ]);
  });

  it('lists only the new badge images after it', async () => {
    vi.useFakeTimers({ now: new Date('2026-12-01T00:00:00.000Z'), toFake: ['Date'] });

    expect(await imagesOf()).toEqual([
      {
        url: 'https://example.test/profile/octocat',
        images: [
          'https://example.test/badge/user/octocat/profile-card.png',
          'https://example.test/badge/user/octocat/rank.png',
        ],
      },
    ]);
  });
});
