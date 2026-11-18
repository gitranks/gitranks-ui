import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { reportContributeConnect, reportLearnEvent } from './contribute-click-tracker';

/** What the browser sent, read back from its beacons. */
const sent = async (beacon: ReturnType<typeof vi.fn>) =>
  Promise.all(beacon.mock.calls.map(async ([, body]) => JSON.parse(await (body as Blob).text())));

describe('reports from the browser', () => {
  let stored: Map<string, string>;
  let beacon: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    stored = new Map([
      ['contribute_last_click_v1', JSON.stringify({ source: 'learn_home_issue', path: '/learn', at: Date.now() })],
    ]);
    const storage = {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => stored.set(key, value),
      removeItem: (key: string) => stored.delete(key),
    };
    beacon = vi.fn(() => true);
    vi.stubGlobal('window', {
      localStorage: storage,
      sessionStorage: storage,
      location: { pathname: '/learn/start/driftwood-js/driftwood/934' },
    });
    vi.stubGlobal('navigator', { sendBeacon: beacon });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('names a connect by the click that led to it', async () => {
    reportContributeConnect('agent');
    expect(await sent(beacon)).toEqual([
      { kind: 'connect', path: '/learn/start/driftwood-js/driftwood/934', target: 'agent', source: 'learn_home_issue' },
    ]);
    expect(stored.has('contribute_last_click_v1')).toBe(false);
  });

  it('names a connect by the place it was made, when told, and still forgets the click', async () => {
    reportContributeConnect('agent', 'learn_start');
    expect(await sent(beacon)).toEqual([
      { kind: 'connect', path: '/learn/start/driftwood-js/driftwood/934', target: 'agent', source: 'learn_start' },
    ]);
    expect(stored.has('contribute_last_click_v1')).toBe(false);
  });

  it("counts the start page's views and its move to the lesson page", async () => {
    reportLearnEvent({ kind: 'learn_view', event: 'learn_start_view', source: 'learn_start' });
    reportLearnEvent({ kind: 'learn_view', event: 'learn_start_claimed', source: 'learn_start' });
    expect((await sent(beacon)).map(({ event, source }) => [event, source])).toEqual([
      ['learn_start_view', 'learn_start'],
      ['learn_start_claimed', 'learn_start'],
    ]);
  });
});
