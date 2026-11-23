import { beforeEach, describe, expect, it, vi } from 'vitest';

import { lessonRouteOf } from './learn-path';

const { graphqlDirect, fixAsk, addressAsk } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  fixAsk: vi.fn(),
  addressAsk: vi.fn(),
}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { lessonGateOf } = await import('./lesson-gate');
const { LearnAddressDocument } = await import('./lesson-page.documents');

const SLUG = 'route-cache-miss-8f3k';
const apiError = (code: string) => new Error(JSON.stringify([{ message: 'no', extensions: { code } }]));

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
const NOT_OURS = { learnAddress: { state: 'MISSING', movedTo: null, title: null, course: null } };
const address = (state: string, movedTo: string | null = null) => ({
  learnAddress: { state, movedTo, title: 'Sets', course: { slug: 'algorithms', title: 'Algorithms' } },
});

beforeEach(() => {
  graphqlDirect.mockReset();
  fixAsk.mockReset();
  addressAsk.mockReset();
  addressAsk.mockResolvedValue(NOT_OURS);
  // Each ask by its document: the address of a lesson of ours, and the lesson of a fix.
  graphqlDirect.mockImplementation((document, ...rest) =>
    document === LearnAddressDocument ? addressAsk(...rest) : fixAsk(...rest),
  );
});

describe('lessonGateOf', () => {
  it('lets a public, removed or held lesson through to its page', async () => {
    for (const lessonPage of [
      { __typename: 'LessonPage' },
      { __typename: 'LessonStub', visibility: 'REMOVED' },
      { __typename: 'LessonStub', visibility: 'HELD' },
    ]) {
      fixAsk.mockResolvedValueOnce({ lessonPage });
      expect(await lessonGateOf({ slug: SLUG })).toEqual({ kind: 'page' });
    }
    expect(fixAsk).toHaveBeenLastCalledWith({ slug: SLUG }, { source: 'ssr' });
  });

  it('answers an unknown or hidden lesson as missing', async () => {
    fixAsk.mockResolvedValueOnce({ lessonPage: null });
    expect(await lessonGateOf({ slug: SLUG })).toEqual({ kind: 'missing' });
    fixAsk.mockResolvedValueOnce({ lessonPage: { __typename: 'LessonStub', visibility: 'HIDDEN' } });
    expect(await lessonGateOf({ slug: SLUG })).toEqual({ kind: 'missing' });
    // As the pages read them: the API's "not there" and "not a valid ask" are a 404.
    for (const code of ['NOT_FOUND', 'BAD_USER_INPUT', 'FORBIDDEN']) {
      fixAsk.mockRejectedValueOnce(apiError(code));
      expect(await lessonGateOf({ slug: SLUG }), code).toEqual({ kind: 'missing' });
    }
  });

  it('leaves any other failure to the page', async () => {
    for (const failure of [
      apiError('INTERNAL_SERVER_ERROR'),
      apiError('GRAPHQL_VALIDATION_FAILED'),
      new Error('down'),
    ]) {
      fixAsk.mockRejectedValueOnce(failure);
      expect(await lessonGateOf({ slug: SLUG })).toEqual({ kind: 'page' });
    }
  });

  it('leaves a slow answer to the page, rather than hold the response', async () => {
    vi.useFakeTimers();
    try {
      fixAsk.mockReturnValueOnce(new Promise(() => {}));
      const gate = lessonGateOf({ slug: SLUG }, 2000);
      await vi.advanceTimersByTimeAsync(2000);
      expect(await gate).toEqual({ kind: 'page' });
    } finally {
      vi.useRealTimers();
    }
  });

  it("answers a login's result: there, missing, or under the login's current name", async () => {
    const route = { slug: SLUG, login: 'octocat' };
    fixAsk.mockResolvedValueOnce({
      lessonResult: { __typename: 'LessonResultPage', login: 'octocat', head: { slug: SLUG } },
    });
    expect(await lessonGateOf(route)).toEqual({ kind: 'page' });
    expect(fixAsk).toHaveBeenLastCalledWith(route, { source: 'ssr' });

    fixAsk.mockResolvedValueOnce({ lessonResult: null });
    expect(await lessonGateOf(route)).toEqual({ kind: 'missing' });
    fixAsk.mockResolvedValueOnce({ lessonResult: { __typename: 'LessonStub', visibility: 'HIDDEN' } });
    expect(await lessonGateOf(route)).toEqual({ kind: 'missing' });
    fixAsk.mockResolvedValueOnce({ lessonResult: { __typename: 'LessonStub', visibility: 'REMOVED' } });
    expect(await lessonGateOf(route)).toEqual({ kind: 'page' });

    fixAsk.mockResolvedValueOnce({
      lessonResult: { __typename: 'LessonResultPage', login: 'octo-cat', head: { slug: SLUG } },
    });
    expect(await lessonGateOf(route)).toEqual({
      kind: 'redirect',
      path: `/learn/lessons/${SLUG}/passes/octo-cat`,
    });
  });
});

describe('lessonGateOf, a lesson of ours', () => {
  it('lets a live lesson of ours through, whatever the fix says', async () => {
    addressAsk.mockResolvedValue(address('LIVE'));
    fixAsk.mockResolvedValue({ lessonPage: null });
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

  it("gives the fix's answer when ours could not be asked", async () => {
    for (const failure of [
      () => addressAsk.mockRejectedValueOnce(new Error('down')),
      () => addressAsk.mockResolvedValueOnce({ learnAddress: null }),
    ]) {
      failure();
      fixAsk.mockResolvedValueOnce({ lessonPage: null });
      expect(await lessonGateOf({ slug: SLUG })).toEqual({ kind: 'missing' });
    }
  });

  it('asks only the fix for a result page', async () => {
    fixAsk.mockResolvedValueOnce({ lessonResult: null });
    expect(await lessonGateOf({ slug: SLUG, login: 'octocat' })).toEqual({ kind: 'missing' });
    expect(addressAsk).not.toHaveBeenCalled();
  });

  it('waits no longer than the limit for either', async () => {
    vi.useFakeTimers();
    try {
      addressAsk.mockReturnValueOnce(new Promise(() => {}));
      fixAsk.mockReturnValueOnce(new Promise(() => {}));
      const gate = lessonGateOf({ slug: SLUG }, 2000);
      await vi.advanceTimersByTimeAsync(2000);
      expect(await gate).toEqual({ kind: 'page' });
    } finally {
      vi.useRealTimers();
    }
  });
});
