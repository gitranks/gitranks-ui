import { describe, expect, it, vi } from 'vitest';

import { FACTS_CACHE_CONTROL, getEntityFactsResponse } from './facts-route';
import { orgBig, repoBig, repoSmall, userBig, userMid } from './fixtures';

const loaders = {
  user: vi.fn(async (login: string) => (login === 'octo-dev' ? userMid : null)),
  org: vi.fn(async (login: string) => (login === 'nebula' ? orgBig : null)),
  repo: vi.fn(async (owner: string, name: string) => (`${owner}/${name}` === 'acme/fastqueue' ? repoBig : null)),
};

describe('getEntityFactsResponse', () => {
  it('answers the facts as JSON, cached', async () => {
    const response = await getEntityFactsResponse('repo', ['acme', 'fastqueue'], loaders);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(FACTS_CACHE_CONTROL.found);
    expect(await response.json()).toEqual(JSON.parse(JSON.stringify(repoBig)));
    expect((await getEntityFactsResponse('user', ['octo-dev'], loaders)).status).toBe(200);
    expect((await getEntityFactsResponse('org', ['nebula'], loaders)).status).toBe(200);
  });

  it('keeps briefly the data that will change soon on its own, and the rest as usual', async () => {
    const soon = {
      ...loaders,
      repo: vi.fn(async () => ({ ...repoSmall, stars: 2_400 })),
      user: vi.fn(async () => ({ ...userMid, s: null, c: null, f: null })),
    };
    expect(repoSmall.history).toBeNull();
    for (const [kind, name] of [
      ['repo', ['acme', 'fastqueue']],
      ['user', ['octo-dev']],
    ] as const) {
      const response = await getEntityFactsResponse(kind, [...name], soon);
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe(FACTS_CACHE_CONTROL.awaitingRead);
    }
    expect(FACTS_CACHE_CONTROL.awaitingRead).toMatch(/s-maxage=300\b/);

    // A small repository waits for a visitor's refresh, which expires its data itself.
    const small = await getEntityFactsResponse('repo', ['acme', 'fastqueue'], {
      ...loaders,
      repo: vi.fn(async () => repoSmall),
    });
    expect(small.headers.get('cache-control')).toBe(FACTS_CACHE_CONTROL.found);
  });

  it.each([
    ['user', ['nobody']],
    ['org', ['octo-dev']],
    ['repo', ['acme']],
    ['repo', ['acme', 'fast', 'queue']],
    ['user', ['bad login']],
    ['team', ['nebula']],
  ])('answers 404 for %s %o, kept briefly', async (kind, name) => {
    const response = await getEntityFactsResponse(kind, name, loaders);
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe(FACTS_CACHE_CONTROL.notFound);
  });

  it('answers an old name of a moved repository with the facts under its current name', async () => {
    // Asked by an old name, the data comes back under the current one; the builder then switches its URL to it.
    const moved = { ...loaders, repo: vi.fn(async () => repoMid) };
    const response = await getEntityFactsResponse('repo', ['old-owner', 'old-name'], moved);

    expect(moved.repo).toHaveBeenCalledWith('old-owner', 'old-name');
    expect(response.status).toBe(200);
    expect((await response.json()).nameWithOwner).toBe('acme/fastqueue');
  });

  it("leaves a developer's wall out while it is not offered", async () => {
    const withWall = { ...loaders, user: vi.fn(async () => userBig) };
    const body = await (await getEntityFactsResponse('user', ['octo-big'], withWall)).json();
    expect(userBig.contributorsWall.popular).toBeTruthy();
    expect(body.contributorsWall).toEqual({});
    expect(body.wallRepos).toBeNull();
    expect(body.login).toBe(userBig.login);
  });

  it('answers 503 when the data cannot be read', async () => {
    const failing = { ...loaders, user: vi.fn(async () => Promise.reject(new Error('down'))) };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await getEntityFactsResponse('user', ['octo-dev'], failing);
    expect(response.status).toBe(503);
  });
});
