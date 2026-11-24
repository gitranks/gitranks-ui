import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readLearnRecord } from './learn-promo-read';

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

describe("reading a login's Learn record in the browser", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads a login's record, and nothing on a failure", async () => {
    fetchMock.mockImplementationOnce(() =>
      json({
        record: { login: 'octocat', lessons: 1, newThings: 2, topics: [], prsOpened: 0, prsMerged: 0, reposHelped: 0 },
      }),
    );
    expect(await readLearnRecord('octocat')).toEqual({
      login: 'octocat',
      lessons: 1,
      newThings: 2,
      topics: [],
      prsOpened: 0,
      prsMerged: 0,
      reposHelped: 0,
    });
    expect(fetchMock).toHaveBeenLastCalledWith('/api/learn/record/octocat');
    fetchMock.mockImplementationOnce(() => json({ error: 'x' }, 500));
    expect(await readLearnRecord('octocat')).toBeNull();
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error('offline')));
    expect(await readLearnRecord('octocat')).toBeNull();
  });

  it('asks nothing for what is not a login', async () => {
    expect(await readLearnRecord('not a login')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
