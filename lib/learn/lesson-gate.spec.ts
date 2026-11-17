import { beforeEach, describe, expect, it, vi } from 'vitest';

import { lessonRouteOf } from './learn-path';

const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));

const { lessonGateOf } = await import('./lesson-gate');

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

describe('lessonGateOf', () => {
  beforeEach(() => graphqlDirect.mockReset());

  it('lets a public, removed or held lesson through to its page', async () => {
    for (const lessonPage of [
      { __typename: 'LessonPage' },
      { __typename: 'LessonStub', visibility: 'REMOVED' },
      { __typename: 'LessonStub', visibility: 'HELD' },
    ]) {
      graphqlDirect.mockResolvedValueOnce({ lessonPage });
      expect(await lessonGateOf({ slug: SLUG })).toEqual({ kind: 'page' });
    }
    expect(graphqlDirect).toHaveBeenLastCalledWith(expect.anything(), { slug: SLUG }, { source: 'ssr' });
  });

  it('answers an unknown or hidden lesson as missing', async () => {
    graphqlDirect.mockResolvedValueOnce({ lessonPage: null });
    expect(await lessonGateOf({ slug: SLUG })).toEqual({ kind: 'missing' });
    graphqlDirect.mockResolvedValueOnce({ lessonPage: { __typename: 'LessonStub', visibility: 'HIDDEN' } });
    expect(await lessonGateOf({ slug: SLUG })).toEqual({ kind: 'missing' });
    graphqlDirect.mockRejectedValueOnce(apiError('NOT_FOUND'));
    expect(await lessonGateOf({ slug: SLUG })).toEqual({ kind: 'missing' });
  });

  it('leaves any other failure to the page', async () => {
    for (const failure of [
      apiError('INTERNAL_SERVER_ERROR'),
      apiError('GRAPHQL_VALIDATION_FAILED'),
      new Error('down'),
    ]) {
      graphqlDirect.mockRejectedValueOnce(failure);
      expect(await lessonGateOf({ slug: SLUG })).toEqual({ kind: 'page' });
    }
  });

  it("answers a login's result: there, missing, or under the login's current name", async () => {
    const route = { slug: SLUG, login: 'octocat' };
    graphqlDirect.mockResolvedValueOnce({
      lessonResult: { __typename: 'LessonResultPage', login: 'octocat', head: { slug: SLUG } },
    });
    expect(await lessonGateOf(route)).toEqual({ kind: 'page' });
    expect(graphqlDirect).toHaveBeenLastCalledWith(expect.anything(), route, { source: 'ssr' });

    graphqlDirect.mockResolvedValueOnce({ lessonResult: null });
    expect(await lessonGateOf(route)).toEqual({ kind: 'missing' });
    graphqlDirect.mockResolvedValueOnce({ lessonResult: { __typename: 'LessonStub', visibility: 'HIDDEN' } });
    expect(await lessonGateOf(route)).toEqual({ kind: 'missing' });
    graphqlDirect.mockResolvedValueOnce({ lessonResult: { __typename: 'LessonStub', visibility: 'REMOVED' } });
    expect(await lessonGateOf(route)).toEqual({ kind: 'page' });

    graphqlDirect.mockResolvedValueOnce({
      lessonResult: { __typename: 'LessonResultPage', login: 'octo-cat', head: { slug: SLUG } },
    });
    expect(await lessonGateOf(route)).toEqual({
      kind: 'redirect',
      path: `/learn/lessons/${SLUG}/passes/octo-cat`,
    });
  });
});
