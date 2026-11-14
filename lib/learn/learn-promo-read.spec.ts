import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetLearnOpenInBrowser } from './learn-open';
import { readLearnPromo, readLearnRecord } from './learn-promo-read';

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const PROMO = { reason: 'Why.', language: 'Go', issues: [] };

/** Answers the Learn gate, then the suggestion's route. */
const routes = (open: boolean, promo: unknown) =>
  fetchMock.mockImplementation((url: string) =>
    url.startsWith('/api/me/learn/open') ? json({ open }) : json({ promo }),
  );

describe('reading a Learn suggestion in the browser', () => {
  beforeEach(() => {
    resetLearnOpenInBrowser();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('asks nothing for a visitor, or on a profile that is not theirs', async () => {
    expect(await readLearnPromo('LANDING', null)).toBeNull();
    expect(await readLearnPromo('PROFILE', 'someone', 'octocat')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks for the suggestion only when Learn is open to the viewer', async () => {
    routes(false, PROMO);
    expect(await readLearnPromo('LANDING', 'octocat')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/open');
  });

  it("answers the viewer's suggestion when Learn is open to them", async () => {
    routes(true, PROMO);
    expect(await readLearnPromo('PROFILE', 'octocat', 'OctoCat')).toEqual(PROMO);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/me/learn/promo?placement=profile&login=octocat');
  });

  it('shows nothing when there is none, or the read fails', async () => {
    routes(true, null);
    expect(await readLearnPromo('LANDING', 'octocat')).toBeNull();
    fetchMock.mockImplementation((url: string) =>
      url.startsWith('/api/me/learn/open') ? json({ open: true }) : Promise.reject(new Error('offline')),
    );
    expect(await readLearnPromo('LANDING', 'octocat')).toBeNull();
  });

  it("reads a login's record, and nothing on a failure", async () => {
    fetchMock.mockImplementationOnce(() => json({ record: { lessons: 1, topics: [], prsOpened: 0, prsMerged: 0 } }));
    expect(await readLearnRecord('octocat')).toEqual({ lessons: 1, topics: [], prsOpened: 0, prsMerged: 0 });
    expect(fetchMock).toHaveBeenLastCalledWith('/api/learn/record/octocat');
    fetchMock.mockImplementationOnce(() => json({ error: 'x' }, 500));
    expect(await readLearnRecord('octocat')).toBeNull();
  });
});
