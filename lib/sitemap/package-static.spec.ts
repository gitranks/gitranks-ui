import { beforeEach, describe, expect, it, vi } from 'vitest';

import staticSitemap from '@/app/sitemaps/static/sitemap';
import { resetPackagesGate } from '@/lib/packages/packages-gate';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://example.test';
});

vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ connection: vi.fn(async () => undefined) }));
const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/contribute/session-token', () => ({ sessionTokenOf: vi.fn() }));

const gate = (everyone: boolean) => ({ packagesGate: { everyone, viewer: false } });

/** The static sitemap's entries as they were before the Unsung heroes archive. */
const BEFORE = [
  { url: 'https://example.test/', changeFrequency: 'monthly', priority: 1 },
  { url: 'https://example.test/countries/stars/1', changeFrequency: 'monthly', priority: 0.9 },
  { url: 'https://example.test/countries/contributions/1', changeFrequency: 'monthly', priority: 0.9 },
  { url: 'https://example.test/countries/followers/1', changeFrequency: 'monthly', priority: 0.9 },
  { url: 'https://example.test/countries/users/1', changeFrequency: 'monthly', priority: 0.9 },
  { url: 'https://example.test/insights', changeFrequency: 'monthly', priority: 0.7 },
  { url: 'https://example.test/badge/gallery', changeFrequency: 'monthly', priority: 0.8 },
  { url: 'https://example.test/badge/builder', changeFrequency: 'monthly', priority: 0.8 },
  { url: 'https://example.test/methodology', changeFrequency: 'monthly', priority: 0.6 },
  { url: 'https://example.test/terms', changeFrequency: 'monthly', priority: 0.2 },
  { url: 'https://example.test/privacy', changeFrequency: 'monthly', priority: 0.2 },
];

describe('the static sitemap, the Unsung heroes archive and how package rankings work', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    resetPackagesGate();
  });

  it('lists exactly what it did before, while the archive is not open to everyone', async () => {
    graphqlDirect.mockResolvedValue(gate(false));

    expect(await staticSitemap()).toEqual(BEFORE);
  });

  it('adds the archive and the package methodology after everything else once they are open to everyone', async () => {
    graphqlDirect.mockResolvedValue(gate(true));

    expect(await staticSitemap()).toEqual([
      ...BEFORE,
      { url: 'https://example.test/unsung-heroes', changeFrequency: 'weekly', priority: 0.6 },
      { url: 'https://example.test/methodology/packages', changeFrequency: 'monthly', priority: 0.6 },
    ]);
  });

  it('lists nothing new when the gate cannot be asked', async () => {
    graphqlDirect.mockRejectedValue(new Error('down'));

    expect(await staticSitemap()).toEqual(BEFORE);
  });

  it('asks the gate once for many requests, not per crawler request', async () => {
    graphqlDirect.mockResolvedValue(gate(true));

    for (let request = 0; request < 5; request++) {
      expect(await staticSitemap()).toHaveLength(BEFORE.length + 2);
    }
    expect(graphqlDirect).toHaveBeenCalledTimes(1);
  });
});
