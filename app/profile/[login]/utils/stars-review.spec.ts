import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fetchStarsReviewOwnerState,
  formatReviewDate,
  type StarsReviewOwnerState,
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
    starsReviewReportState({ reportable: true, viewer: 'anonymous', owner: 'loading', pending: false, ...input });

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

  it('shows the owner the public view, without a button, when their state is not available', () => {
    expect(state({ viewer: 'owner', owner: 'public' })).toEqual({ kind: 'none' });
  });
});

describe('fetchStarsReviewOwnerState', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads the owner state outside any cache', async () => {
    const fetch = vi.fn(async () => jsonResponse(200, ownerState()));
    vi.stubGlobal('fetch', fetch);

    await expect(fetchStarsReviewOwnerState('OctoCat')).resolves.toEqual(ownerState());
    expect(fetch).toHaveBeenCalledWith('/api/profile/OctoCat/stars-review', { cache: 'no-store' });
  });

  it.each([401, 403, 404, 500])('gives null on %i', async (status) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(status, { message: 'no' })),
    );

    await expect(fetchStarsReviewOwnerState('octocat')).resolves.toBeNull();
  });

  it('gives null when the request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('offline');
      }),
    );

    await expect(fetchStarsReviewOwnerState('octocat')).resolves.toBeNull();
  });
});

describe('submitStarsReviewReport', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('gives the date the report was stored', async () => {
    const fetch = vi.fn(async () => jsonResponse(200, { submittedAt: '2026-10-17T09:30:00.000Z' }));
    vi.stubGlobal('fetch', fetch);

    await expect(submitStarsReviewReport('octocat')).resolves.toBe('2026-10-17T09:30:00.000Z');
    expect(fetch).toHaveBeenCalledWith('/api/profile/octocat/stars-review', { method: 'POST' });
  });

  it('gives the stored date when the report had been sent before', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(409, { submittedAt: '2026-10-16T08:00:00.000Z' })),
    );

    await expect(submitStarsReviewReport('octocat')).resolves.toBe('2026-10-16T08:00:00.000Z');
  });

  it.each([
    [409, { submittedAt: null }],
    [403, { message: 'Forbidden' }],
    [404, { message: 'Not Found' }],
    [500, { message: 'Stars review request failed' }],
  ])('gives null on %i', async (status, body) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse(status, body)),
    );

    await expect(submitStarsReviewReport('octocat')).resolves.toBeNull();
  });
});
