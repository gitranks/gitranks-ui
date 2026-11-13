import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect } = vi.hoisted(() => ({ graphqlDirect: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/contribute/contribute.data', () => ({
  ContributeUnavailableError: class extends Error {},
  viewerLogin: vi.fn(),
}));
vi.mock('@/lib/contribute/maintainer-token', () => ({ currentMaintainerToken: vi.fn() }));

const { GET } = await import('./route');
const { LessonResultDocument } = await import('@/lib/learn/learn.documents');
const { result, stub } = await import('@/lib/learn/__fixtures__/shared');

const get = (slug: string, login: string) =>
  GET(new Request(`https://gitranks.com/api/learn/lessons/${slug}/passes/${login}`), {
    params: Promise.resolve({ slug, login }),
  });

const failure = (code: string) => new Error(JSON.stringify([{ message: code, extensions: { code } }]));

describe('a result page as JSON', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    vi.stubEnv('NEXT_PUBLIC_URI', 'https://gitranks.com');
  });

  it('answers the facts of the pass from the anonymous read, never kept by a cache', async () => {
    graphqlDirect.mockResolvedValue({ lessonResult: result() });
    const response = await get('route-cache-miss-8f3k', 'octocat');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json();
    expect(body).toMatchObject({
      login: 'octocat',
      githubId: 583231,
      version: 1,
      passedAt: '2026-10-28T11:21:00.000Z',
      lesson: { slug: 'route-cache-miss-8f3k', url: 'https://gitranks.com/learn/lessons/route-cache-miss-8f3k' },
    });
    expect(body.steps.map((step: { state: string }) => step.state)).toEqual([
      'first_try',
      'try_n',
      'knew',
      'first_try',
      'first_try',
    ]);
    expect(graphqlDirect).toHaveBeenCalledWith(
      LessonResultDocument,
      { slug: 'route-cache-miss-8f3k', login: 'octocat' },
      { source: 'ssr' },
    );
  });

  it('answers 404 with no public pass, an unknown lesson or a hidden one, and 410 once its author removed it', async () => {
    graphqlDirect.mockResolvedValueOnce({ lessonResult: null });
    expect((await get('route-cache-miss-8f3k', 'mona')).status).toBe(404);
    graphqlDirect.mockRejectedValueOnce(failure('NOT_FOUND'));
    expect((await get('route-cache-miss-8f3k', 'mona')).status).toBe(404);
    graphqlDirect.mockResolvedValueOnce({ lessonResult: stub('HIDDEN') });
    expect((await get('route-cache-miss-8f3k', 'octocat')).status).toBe(404);
    graphqlDirect.mockResolvedValueOnce({ lessonResult: stub('REMOVED') });
    expect((await get('route-cache-miss-8f3k', 'octocat')).status).toBe(410);
  });

  it('never asks the API about a slug or a login not shaped as ours', async () => {
    expect((await get('a.b', 'octocat')).status).toBe(404);
    expect((await get('route-cache-miss-8f3k', 'octo.cat')).status).toBe(404);
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('says so when the API does not answer', async () => {
    graphqlDirect.mockRejectedValue(new Error('GraphQL error! 502: Bad Gateway'));
    expect((await get('route-cache-miss-8f3k', 'octocat')).status).toBe(503);
  });
});
