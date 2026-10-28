import { beforeEach, describe, expect, it, vi } from 'vitest';

const graphqlDirect = vi.fn();
const cacheLife = vi.fn();
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('next/cache', () => ({ cacheLife, cacheTag: vi.fn() }));

const { fetchRepo, isLookupUnavailable } = await import('./fetch-repo');

/** The request helper's error for an answer with GraphQL errors. */
const apiError = (code: string) => new Error(JSON.stringify([{ message: 'x', path: ['repo'], extensions: { code } }]));

describe('fetchRepo', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    cacheLife.mockReset();
  });

  it('keeps a repository the API could not look up for minutes, as not found', async () => {
    graphqlDirect.mockRejectedValue(apiError('REPO_LOOKUP_UNAVAILABLE'));

    await expect(fetchRepo('facebook', 'react')).resolves.toBeNull();
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('minutes');
  });

  it('keeps an unknown repository for hours', async () => {
    graphqlDirect.mockResolvedValue({ repo: null });

    await expect(fetchRepo('nobody', 'nothing')).resolves.toBeNull();
    expect(cacheLife).toHaveBeenLastCalledWith('hours');
  });

  it('lets any other failure through', async () => {
    graphqlDirect.mockRejectedValue(apiError('INTERNAL_SERVER_ERROR'));

    await expect(fetchRepo('a', 'b')).rejects.toThrow('INTERNAL_SERVER_ERROR');
    expect(isLookupUnavailable(new Error('GraphQL error! 502: Bad Gateway'))).toBe(false);
  });
});
