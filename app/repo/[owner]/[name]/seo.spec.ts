import { describe, expect, it } from 'vitest';

import { buildRepoMetadata, isRepoRanked } from './seo';

type Repo = Parameters<typeof buildRepoMetadata>[0];

const repo = (overrides: Partial<Repo> = {}): Repo => ({
  nameWithOwner: 'vercel/next.js',
  description: 'The React Framework',
  stars: 130_000,
  rank: { s: 12, sM: 14, l: 3, lM: 3, language: 'JavaScript' },
  ...overrides,
});

describe('buildRepoMetadata', () => {
  it('canonicalizes to the stored name and describes the rank', () => {
    const metadata = buildRepoMetadata(repo());

    expect(metadata.alternates?.canonical).toBe('/repo/vercel/next.js');
    expect(metadata.title).toBe('vercel/next.js - GitHub Repository Rank');
    expect(metadata.description).toBe('Global rank: 12th. 130K stars. The React Framework');
    expect(metadata.robots).toBeUndefined();
  });

  it('keeps a repository under the rank threshold out of the index', () => {
    const metadata = buildRepoMetadata(repo({ stars: 99, rank: null }));

    expect(metadata.robots).toEqual({ index: false });
    expect(metadata.description).toBe('99 stars. The React Framework');
  });

  it('keeps an unranked repository out of the index', () => {
    expect(isRepoRanked(repo({ rank: null }))).toBe(false);
    expect(buildRepoMetadata(repo({ rank: null })).robots).toEqual({ index: false });
  });

  it('shows no rank for a repository that fell under the threshold', () => {
    expect(isRepoRanked(repo({ stars: 98 }))).toBe(false);
  });
});
