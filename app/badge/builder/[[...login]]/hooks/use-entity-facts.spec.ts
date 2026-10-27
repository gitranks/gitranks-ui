import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchEntityFacts, nextFactsState, recheckEntityFacts, seedEntityFacts } from './use-entity-facts';
import { orgBig, repoBig, repoMid, userMid } from '@/badge/v3/fixtures';

const answer = (status: number, body: unknown = { error: 'x' }) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchEntityFacts', () => {
  it('asks for a found entity once', async () => {
    const fetch = vi.fn(() => answer(200, orgBig));
    vi.stubGlobal('fetch', fetch);
    expect(await fetchEntityFacts('org', 'found-org')).toEqual(orgBig);
    expect(await fetchEntityFacts('org', 'Found-Org')).toEqual(orgBig);
    expect(fetch).toHaveBeenCalledTimes(1);
    // The browser checks with the site; the page keeps what it found.
    expect(fetch).toHaveBeenCalledWith('/api/badge/v3/org/found-org', { cache: 'no-cache' });
  });

  it('asks again after a miss, so a page fetched meanwhile shows up', async () => {
    const fetch = vi.fn().mockReturnValueOnce(answer(404)).mockReturnValueOnce(answer(200, orgBig));
    vi.stubGlobal('fetch', fetch);
    expect(await fetchEntityFacts('org', 'late-org')).toBeNull();
    expect(await fetchEntityFacts('org', 'late-org')).toEqual(orgBig);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('asks again after a failure', async () => {
    const fetch = vi.fn().mockReturnValueOnce(answer(503)).mockReturnValueOnce(answer(200, repoMid));
    vi.stubGlobal('fetch', fetch);
    await expect(fetchEntityFacts('repo', 'acme/flaky')).rejects.toThrow('503');
    expect(await fetchEntityFacts('repo', 'acme/flaky')).toEqual(repoMid);
    expect(fetch).toHaveBeenCalledWith('/api/badge/v3/repo/acme/flaky', { cache: 'no-cache' });
  });

  it('uses facts step 1 already holds, even after a failed lookup of the same name', async () => {
    const fetch = vi.fn(() => answer(503));
    vi.stubGlobal('fetch', fetch);
    await expect(fetchEntityFacts('repo', 'acme/fastqueue')).rejects.toThrow();
    seedEntityFacts(repoMid);
    expect(await fetchEntityFacts('repo', 'acme/fastqueue')).toEqual(repoMid);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('recheckEntityFacts', () => {
  it("reads a repository's fetch status, then asks without the HTTP caches and keeps the new answer", async () => {
    seedEntityFacts(repoMid);
    const fetch = vi.fn((url: string) => (url.includes('/pull') ? answer(200, { pull: null }) : answer(200, repoBig)));
    vi.stubGlobal('fetch', fetch);
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    expect(await recheckEntityFacts('repo', 'acme/fastqueue')).toEqual(repoBig);
    expect(fetch.mock.calls).toEqual([
      ['/api/repo/acme/fastqueue/pull', { cache: 'no-store' }],
      ['/api/badge/v3/repo/acme/fastqueue?fresh=1700000000000', { cache: 'no-store' }],
    ]);
    // The new answer replaces the one step 1 held.
    expect(await fetchEntityFacts('repo', 'acme/fastqueue')).toEqual(repoBig);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("asks a developer's cache to expire, and asks anyway when that fails", async () => {
    const fetch = vi.fn((url: string) =>
      url === '/api/revalidate' ? Promise.reject(new Error('x')) : answer(200, userMid),
    );
    vi.stubGlobal('fetch', fetch);

    expect(await recheckEntityFacts('user', 'octo-dev')).toEqual(userMid);
    expect(fetch.mock.calls[0]).toEqual([
      '/api/revalidate',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"login":"octo-dev"}' },
    ]);
    expect(fetch.mock.calls[1][0]).toMatch(/^\/api\/badge\/v3\/user\/octo-dev\?fresh=\d+$/);
  });

  it('asks an organization without the HTTP caches alone', async () => {
    const fetch = vi.fn(() => answer(200, orgBig));
    vi.stubGlobal('fetch', fetch);
    expect(await recheckEntityFacts('org', 'nebula')).toEqual(orgBig);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('nextFactsState', () => {
  const found = {
    status: 'found' as const,
    facts: repoMid,
    key: 'repo:acme/fastqueue#0',
    entity: 'repo:acme/fastqueue',
  };

  it('keeps the facts found for an entity when a later ask for it misses or fails', () => {
    for (const status of ['missing', 'error'] as const) {
      expect(nextFactsState(found, { status, key: 'repo:acme/fastqueue#1', entity: 'repo:acme/fastqueue' })).toEqual({
        ...found,
        key: 'repo:acme/fastqueue#1',
      });
    }
  });

  it('takes a new answer for the entity, and any answer for another one', () => {
    const fresh = {
      status: 'found' as const,
      facts: repoBig,
      key: 'repo:acme/fastqueue#1',
      entity: 'repo:acme/fastqueue',
    };
    expect(nextFactsState(found, fresh)).toBe(fresh);
    const other = { status: 'missing' as const, key: 'repo:acme/other#1', entity: 'repo:acme/other' };
    expect(nextFactsState(found, other)).toBe(other);
    expect(nextFactsState({ status: 'loading' }, other)).toBe(other);
  });
});
