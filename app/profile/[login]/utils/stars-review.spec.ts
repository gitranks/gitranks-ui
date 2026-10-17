import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fetchStarsReviewOwnerState,
  formatReviewDate,
  loadStarsReviewOwnerState,
  type StarsReviewOwnerState,
  sendStarsReviewReport,
  starsReviewNote,
  starsReviewReportState,
  starsReviewViewer,
  submitStarsReviewReport,
} from './stars-review';
import { StarsReviewStatus } from '@/types/generated/graphql';

const ownerState = (patch: Partial<StarsReviewOwnerState> = {}): StarsReviewOwnerState => ({
  status: StarsReviewStatus.Reviewing,
  stars: 1234,
  repositories: 801,
  reportable: true,
  report: null,
  decision: null,
  decidedAt: null,
  ...patch,
});

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Answers each request with the next response, in order; an error is thrown instead. */
const stubFetch = (...responses: (Response | Error)[]) => {
  const fetch = vi.fn(async () => {
    const next = responses.shift() ?? new Error('no response left');

    if (next instanceof Error) {
      throw next;
    }

    return next;
  });

  vi.stubGlobal('fetch', fetch);
  return fetch;
};

describe('starsReviewNote', () => {
  it('says the stars do not count while the review runs', () => {
    expect(starsReviewNote({ status: StarsReviewStatus.Reviewing, stars: 1234, repositories: 801 })).toBe(
      "We're reviewing an unusual starring pattern. Until we're done, 1,234 stars on 801 repositories don't count toward this ranking.",
    );
  });

  it('says why the stars do not count once they are not counted', () => {
    expect(starsReviewNote({ status: StarsReviewStatus.NotCounted, stars: 12345, repositories: 1001 })).toBe(
      "12,345 stars on 1,001 repositories don't count toward this ranking: they don't look like organic interest in the projects.",
    );
  });

  it('uses the singular for one star on one repository', () => {
    expect(starsReviewNote({ status: StarsReviewStatus.Reviewing, stars: 1, repositories: 1 })).toBe(
      "We're reviewing an unusual starring pattern. Until we're done, 1 star on 1 repository doesn't count toward this ranking.",
    );
    expect(starsReviewNote({ status: StarsReviewStatus.NotCounted, stars: 1, repositories: 1 })).toBe(
      "1 star on 1 repository doesn't count toward this ranking: it doesn't look like organic interest in the project.",
    );
  });
});

describe('formatReviewDate', () => {
  it('formats a date as day, short month and year, in UTC', () => {
    expect(formatReviewDate('2026-10-17T09:30:00.000Z')).toBe('17 Oct 2026');
    expect(formatReviewDate('2026-09-03T23:59:00.000Z')).toBe('3 Sep 2026');
  });

  it('gives null for a value that is not a date', () => {
    expect(formatReviewDate('soon')).toBeNull();
  });
});

describe('starsReviewViewer', () => {
  it('waits for the session', () => {
    expect(starsReviewViewer('loading', undefined, 'octocat')).toBe('loading');
  });

  it('tells a signed-out visitor, another account and the owner apart, ignoring letter case', () => {
    expect(starsReviewViewer('unauthenticated', undefined, 'octocat')).toBe('anonymous');
    expect(starsReviewViewer('authenticated', 'someone', 'octocat')).toBe('other');
    expect(starsReviewViewer('authenticated', 'OctoCat', 'octocat')).toBe('owner');
  });
});

describe('starsReviewReportState', () => {
  const state = (input: Partial<Parameters<typeof starsReviewReportState>[0]>) =>
    starsReviewReportState({
      reportable: true,
      viewer: 'anonymous',
      owner: 'loading',
      sentAt: null,
      pending: false,
      ...input,
    });

  it('sends a signed-out visitor to sign in', () => {
    expect(state({ viewer: 'anonymous' })).toEqual({ kind: 'button', action: 'signIn' });
  });

  it('asks another account to sign in as the owner', () => {
    expect(state({ viewer: 'other' })).toEqual({ kind: 'button', action: 'switchAccount' });
  });

  it('keeps the button disabled until the session and then the owner state are known', () => {
    expect(state({ viewer: 'loading' })).toEqual({ kind: 'button', action: 'wait' });
    expect(state({ viewer: 'owner', owner: 'loading' })).toEqual({ kind: 'button', action: 'wait' });
  });

  it('lets the owner report once, and disables the button while the report is sent', () => {
    expect(state({ viewer: 'owner', owner: ownerState() })).toEqual({ kind: 'button', action: 'report' });
    expect(state({ viewer: 'owner', owner: ownerState(), pending: true })).toEqual({ kind: 'button', action: 'wait' });
  });

  it('shows the owner when their request was submitted', () => {
    const owner = ownerState({ report: { submittedAt: '2026-10-17T09:30:00.000Z' } });

    expect(state({ viewer: 'owner', owner })).toEqual({ kind: 'submitted', submittedAt: '2026-10-17T09:30:00.000Z' });
  });

  it('shows the owner when their request was declined, even though the page says it is not reportable', () => {
    const owner = ownerState({
      status: StarsReviewStatus.NotCounted,
      reportable: false,
      report: { submittedAt: '2026-10-17T09:30:00.000Z' },
      decision: 'declined',
      decidedAt: '2026-10-18T12:00:00.000Z',
    });

    expect(state({ viewer: 'owner', owner, reportable: false })).toEqual({
      kind: 'declined',
      decidedAt: '2026-10-18T12:00:00.000Z',
    });
  });

  it('shows no button to anyone when the review is not reportable', () => {
    for (const viewer of ['loading', 'anonymous', 'other', 'owner'] as const) {
      expect(state({ viewer, reportable: false })).toEqual({ kind: 'none' });
    }
    expect(state({ viewer: 'owner', owner: ownerState({ reportable: false }) })).toEqual({ kind: 'none' });
  });

  it('trusts the owner state over the cached page', () => {
    expect(state({ viewer: 'owner', owner: ownerState(), reportable: false })).toEqual({
      kind: 'button',
      action: 'report',
    });
  });

  it('shows the owner the public view, without a button, when they have no state to see', () => {
    expect(state({ viewer: 'owner', owner: 'public' })).toEqual({ kind: 'none' });
  });

  it('leaves the cached page to decide when the owner state could not be read', () => {
    expect(state({ viewer: 'owner', owner: 'failed' })).toEqual({ kind: 'button', action: 'report' });
    expect(state({ viewer: 'owner', owner: 'failed', pending: true })).toEqual({ kind: 'button', action: 'wait' });
    expect(state({ viewer: 'owner', owner: 'failed', reportable: false })).toEqual({ kind: 'none' });
  });

  it('shows the date of a report this page sent, whatever the owner state', () => {
    for (const owner of ['loading', 'failed', ownerState()] as const) {
      expect(state({ viewer: 'owner', owner, sentAt: '2026-10-17T09:30:00.000Z' })).toEqual({
        kind: 'submitted',
        submittedAt: '2026-10-17T09:30:00.000Z',
      });
    }
  });

  it('uses the owner state and the sent date for the owner only', () => {
    const owner = ownerState({ report: { submittedAt: '2026-10-17T09:30:00.000Z' } });

    expect(state({ viewer: 'other', owner, sentAt: '2026-10-17T09:30:00.000Z' })).toEqual({
      kind: 'button',
      action: 'switchAccount',
    });
  });
});

describe('fetchStarsReviewOwnerState', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads the owner state outside any cache', async () => {
    const fetch = stubFetch(jsonResponse(200, ownerState()));

    await expect(fetchStarsReviewOwnerState('OctoCat')).resolves.toEqual(ownerState());
    expect(fetch).toHaveBeenCalledWith('/api/profile/OctoCat/stars-review', { cache: 'no-store' });
  });

  it.each([403, 404])('gives the public view on %i', async (status) => {
    stubFetch(jsonResponse(status, { message: 'no' }));

    await expect(fetchStarsReviewOwnerState('octocat')).resolves.toBe('public');
  });

  it.each([401, 500])('tells a failed read apart on %i', async (status) => {
    stubFetch(jsonResponse(status, { message: 'no' }));

    await expect(fetchStarsReviewOwnerState('octocat')).resolves.toBe('failed');
  });

  it('tells a failed read apart when the request fails', async () => {
    stubFetch(new TypeError('offline'));

    await expect(fetchStarsReviewOwnerState('octocat')).resolves.toBe('failed');
  });
});

describe('loadStarsReviewOwnerState', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('makes no request for anyone but the owner', () => {
    const fetch = stubFetch();

    for (const viewer of ['loading', 'anonymous', 'other'] as const) {
      expect(loadStarsReviewOwnerState(viewer, 'octocat')).toBeNull();
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reads the owner state for the owner', async () => {
    const fetch = stubFetch(jsonResponse(200, ownerState()));

    await expect(loadStarsReviewOwnerState('owner', 'octocat')).resolves.toEqual(ownerState());
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('submitStarsReviewReport', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('gives the date the report was stored', async () => {
    const fetch = stubFetch(jsonResponse(200, { submittedAt: '2026-10-17T09:30:00.000Z' }));

    await expect(submitStarsReviewReport('octocat')).resolves.toBe('2026-10-17T09:30:00.000Z');
    expect(fetch).toHaveBeenCalledWith('/api/profile/octocat/stars-review', { method: 'POST' });
  });

  it('gives the stored date when the report had been sent before', async () => {
    stubFetch(jsonResponse(409, { submittedAt: '2026-10-16T08:00:00.000Z' }));

    await expect(submitStarsReviewReport('octocat')).resolves.toBe('2026-10-16T08:00:00.000Z');
  });

  it.each([
    [409, { submittedAt: null }],
    [403, { message: 'Forbidden' }],
    [404, { message: 'Not Found' }],
    [500, { message: 'Stars review request failed' }],
  ])('gives null on %i', async (status, body) => {
    stubFetch(jsonResponse(status, body));

    await expect(submitStarsReviewReport('octocat')).resolves.toBeNull();
  });
});

describe('sendStarsReviewReport', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('gives the stored date, without reading the owner state again', async () => {
    const fetch = stubFetch(jsonResponse(409, { submittedAt: '2026-10-16T08:00:00.000Z' }));

    await expect(sendStarsReviewReport('octocat')).resolves.toEqual({
      outcome: 'sent',
      submittedAt: '2026-10-16T08:00:00.000Z',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('lets the owner try again when the report failed and the review is still open', async () => {
    stubFetch(jsonResponse(500, {}), jsonResponse(200, ownerState()));

    await expect(sendStarsReviewReport('octocat')).resolves.toEqual({ outcome: 'failed', owner: ownerState() });
  });

  it('lets the owner try again when the owner state could not be read either', async () => {
    stubFetch(new TypeError('offline'), new TypeError('offline'));

    await expect(sendStarsReviewReport('octocat')).resolves.toEqual({ outcome: 'failed', owner: 'failed' });
  });

  it.each([
    [
      'declined meanwhile',
      jsonResponse(409, { submittedAt: null }),
      jsonResponse(200, ownerState({ reportable: false })),
    ],
    [
      'reported from elsewhere',
      jsonResponse(500, {}),
      jsonResponse(200, ownerState({ report: { submittedAt: '2026-10-16T08:00:00.000Z' } })),
    ],
    ['no longer held', jsonResponse(404, {}), jsonResponse(404, {})],
  ])('closes the report when the review changed (%s)', async (_, post, read) => {
    stubFetch(post, read);

    await expect(sendStarsReviewReport('octocat')).resolves.toMatchObject({ outcome: 'closed' });
  });
});
