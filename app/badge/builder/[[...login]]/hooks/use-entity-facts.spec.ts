import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchEntityFacts, recheckEntityFacts, seedEntityFacts } from './use-entity-facts';
import { orgBig, repoBig, repoMid, userMid } from '@/badge/v3/fixtures';

const answer = (status: number, body: unknown = { error: 'x' }) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

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
  it("reads a repository's fetch status, then asks past every cache and keeps the new answer", async () => {
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
    vi.restoreAllMocks();
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

  it('asks an organization past every cache alone', async () => {
    const fetch = vi.fn(() => answer(200, orgBig));
    vi.stubGlobal('fetch', fetch);
    expect(await recheckEntityFacts('org', 'nebula')).toEqual(orgBig);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
