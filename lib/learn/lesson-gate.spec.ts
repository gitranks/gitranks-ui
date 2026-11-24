import { beforeEach, describe, expect, it, vi } from 'vitest';

import { lessonRouteOf } from './learn-path';

const { graphqlDirect, addressAsk, passAsk } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  addressAsk: vi.fn(),
  passAsk: vi.fn(),
}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { lessonGateOf } = await import('./lesson-gate');
const { LearnAddressDocument } = await import('./lesson-page.documents');

const SLUG = 'route-cache-miss-8f3k';

describe('lessonRouteOf', () => {
  it('reads a lesson page and a result page, as the links write them', () => {
    expect(lessonRouteOf(`/learn/lessons/${SLUG}`)).toEqual({ slug: SLUG });
    expect(lessonRouteOf(`/learn/lessons/${SLUG}/`)).toEqual({ slug: SLUG });
    expect(lessonRouteOf(`/learn/lessons/${SLUG}/passes/Octo-cat`)).toEqual({ slug: SLUG, login: 'Octo-cat' });
    expect(lessonRouteOf(`/learn/lessons/${SLUG}/passes/Octo-cat/`)).toEqual({ slug: SLUG, login: 'Octo-cat' });
  });

  it('reads nothing else', () => {
    for (const path of [
      '/learn/lessons',
      '/learn/lessons/',
      '/learn/lessons/_missing',
      '/learn/lessons/-x',
      `/learn/lessons/${SLUG}/passes`,
      `/learn/lessons/${SLUG}/passes/octo.cat`,
      `/learn/lessons/${SLUG}/passes/octocat.json`,
      `/learn/lessons/${SLUG}/passes/octocat/x`,
      `/learn/lessons/${SLUG}/x`,
      `/learn/lessons/route%2Fcache`,
      `/Learn/Lessons/${SLUG}`,
      `/learn/attempts/${SLUG}`,
    ]) {
      expect(lessonRouteOf(path), path).toBeNull();
    }
  });
});

/** An address that is not one of ours: the fix's answer counts. */

/** An address that is not one of ours: the walkthrough's answer counts. */
const NOT_OURS = { learnAddress: { state: 'MISSING', movedTo: null, title: null, course: null } };
const address = (state: string, movedTo: string | null = null) => ({
  learnAddress: { state, movedTo, title: 'Sets', course: { slug: 'algorithms', title: 'Algorithms' } },
});
const fixAt = (state: string, login: string | null = 'octo-cat') => ({
  learnFixAddress: { state, owner: 'acme', repo: 'widgets', number: 57, login },
});

beforeEach(() => {
  graphqlDirect.mockReset();
  addressAsk.mockReset();
  passAsk.mockReset();
  addressAsk.mockResolvedValue(NOT_OURS);
  passAsk.mockResolvedValue({ learnFixAddress: { state: 'MISSING' } });
  // Each ask by its document: the address of a lesson of ours, and where a walkthrough's old address is now.
  graphqlDirect.mockImplementation((document, ...rest) =>
    document === LearnAddressDocument ? addressAsk(...rest) : passAsk(...rest),
  );
});

describe("lessonGateOf, a walkthrough's old address", () => {
  it("sends it to its fix's page for good, a taken-down one too", async () => {
    for (const state of ['LIVE', 'REMOVED']) {
      passAsk.mockResolvedValueOnce(fixAt(state));
      expect(await lessonGateOf({ slug: SLUG }), state).toEqual({
        kind: 'redirect',
        path: '/learn/fixes/acme/widgets/57',
        permanent: true,
      });
    }
    expect(passAsk).toHaveBeenLastCalledWith(
      { slug: SLUG, login: null },
      { source: 'ssr', signal: expect.any(AbortSignal) },
    );
  });

  it('answers one with no fix page as missing', async () => {
    expect(await lessonGateOf({ slug: SLUG })).toEqual({ kind: 'missing' });
    passAsk.mockResolvedValueOnce({ learnFixAddress: { state: 'LIVE', owner: null, repo: null, number: null } });
    expect(await lessonGateOf({ slug: SLUG })).toEqual({ kind: 'missing' });
  });

  it('leaves a failure, or an answer it cannot read, to the page', async () => {
    passAsk.mockRejectedValueOnce(new Error('down'));
    expect(await lessonGateOf({ slug: SLUG })).toEqual({ kind: 'page' });
    passAsk.mockResolvedValueOnce({ learnFixAddress: null });
    expect(await lessonGateOf({ slug: SLUG })).toEqual({ kind: 'page' });
  });

  it('leaves a slow answer to the page, rather than hold the response, and stops the ask', async () => {
    vi.useFakeTimers();
    try {
      passAsk.mockReturnValueOnce(new Promise(() => {}));
      const gate = lessonGateOf({ slug: SLUG }, 2000);
      await vi.advanceTimersByTimeAsync(2000);
      expect(await gate).toEqual({ kind: 'page' });
      expect((passAsk.mock.calls.at(-1)?.[1] as { signal?: AbortSignal } | undefined)?.signal?.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('lessonGateOf, an old result page', () => {
  const route = { slug: SLUG, login: 'octocat' };

  it("sends it to the person's answers on the fix's page for good, shared or kept private", async () => {
    for (const state of ['LIVE', 'PRIVATE']) {
      passAsk.mockResolvedValueOnce(fixAt(state));
      expect(await lessonGateOf(route)).toEqual({
        kind: 'redirect',
        path: '/learn/fixes/acme/widgets/57/walkthrough/by/octo-cat',
        permanent: true,
      });
    }
    expect(passAsk).toHaveBeenLastCalledWith(route, { source: 'ssr', signal: expect.any(AbortSignal) });
    // The answer names no login: the one asked for.
    passAsk.mockResolvedValueOnce(fixAt('LIVE', null));
    expect(await lessonGateOf(route)).toMatchObject({ path: '/learn/fixes/acme/widgets/57/walkthrough/by/octocat' });
  });

  it('answers it as missing with no answers page to go to', async () => {
    expect(await lessonGateOf(route)).toEqual({ kind: 'missing' });
    passAsk.mockResolvedValueOnce(fixAt('REMOVED'));
    expect(await lessonGateOf(route)).toEqual({ kind: 'missing' });
  });

  it('asks only for the walkthrough', async () => {
    await lessonGateOf(route);
    expect(addressAsk).not.toHaveBeenCalled();
  });
});

describe('lessonGateOf, a lesson of ours', () => {
  it('lets a live lesson of ours through, whatever the walkthrough says', async () => {
    addressAsk.mockResolvedValue(address('LIVE'));
    passAsk.mockResolvedValue(fixAt('LIVE'));
    expect(await lessonGateOf({ slug: 'find-duplicates-with-a-set' })).toEqual({ kind: 'page' });
    expect(addressAsk).toHaveBeenCalledWith({ kind: 'lesson', slug: 'find-duplicates-with-a-set' }, { source: 'ssr' });
  });

  it('answers a paused lesson with a 503 and a removed one with a 410, on the page that says so', async () => {
    addressAsk.mockResolvedValueOnce(address('PAUSED'));
    expect(await lessonGateOf({ slug: 'sets' })).toEqual({
      kind: 'gone',
      status: 503,
      path: '/learn/lessons/_gone/sets',
    });
    addressAsk.mockResolvedValueOnce(address('REMOVED'));
    expect(await lessonGateOf({ slug: 'sets' })).toEqual({
      kind: 'gone',
      status: 410,
      path: '/learn/lessons/_gone/sets',
    });
  });

  it('sends a moved lesson to its new address for good', async () => {
    addressAsk.mockResolvedValueOnce(address('MOVED', 'sets-in-one-pass'));
    expect(await lessonGateOf({ slug: 'sets' })).toEqual({
      kind: 'redirect',
      path: '/learn/lessons/sets-in-one-pass',
      permanent: true,
    });
  });

  it("leaves a walkthrough's missing to the page when ours could not be asked, so a live lesson is never a 404", async () => {
    const failures = [
      () => addressAsk.mockRejectedValueOnce(new Error('down')),
      () => addressAsk.mockResolvedValueOnce({ learnAddress: null }),
    ];
    for (const failure of failures) {
      failure();
      expect(await lessonGateOf({ slug: 'find-duplicates-with-a-set' })).toEqual({ kind: 'page' });
    }
    // Its redirect still counts.
    addressAsk.mockRejectedValueOnce(new Error('down'));
    passAsk.mockResolvedValueOnce(fixAt('LIVE'));
    expect(await lessonGateOf({ slug: 'find-duplicates-with-a-set' })).toMatchObject({ kind: 'redirect' });
  });

  it('leaves a slow ask of ours to the page, though the walkthrough said missing', async () => {
    vi.useFakeTimers();
    try {
      addressAsk.mockReturnValueOnce(new Promise(() => {}));
      const gate = lessonGateOf({ slug: 'find-duplicates-with-a-set' }, 2000);
      await vi.advanceTimersByTimeAsync(2000);
      expect(await gate).toEqual({ kind: 'page' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('waits no longer than the limit for either', async () => {
    vi.useFakeTimers();
    try {
      addressAsk.mockReturnValueOnce(new Promise(() => {}));
      passAsk.mockReturnValueOnce(new Promise(() => {}));
      const gate = lessonGateOf({ slug: SLUG }, 2000);
      await vi.advanceTimersByTimeAsync(2000);
      expect(await gate).toEqual({ kind: 'page' });
    } finally {
      vi.useRealTimers();
    }
  });
});
