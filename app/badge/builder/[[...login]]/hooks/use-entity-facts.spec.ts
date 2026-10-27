import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchEntityFacts, seedEntityFacts } from './use-entity-facts';
import { orgBig, repoMid } from '@/badge/v3/fixtures';

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
    expect(fetch).toHaveBeenCalledWith('/api/badge/v3/org/found-org');
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
    expect(fetch).toHaveBeenCalledWith('/api/badge/v3/repo/acme/flaky');
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
