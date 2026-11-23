import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, current } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  current: { session: null as Session | null },
}));

type Context = { params: Promise<{ slug: string }> };
type Handler = (req: NextRequest & { auth: Session | null }, context: Context) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }, context: Context) => {
    req.auth = current.session;
    return handler(req, context);
  },
}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));

const { GET } = (await import('./route')) as unknown as {
  GET: (req: NextRequest, context: Context) => Promise<Response>;
};
const { LearnLessonMineDocument } = await import('@/lib/learn/lesson-page.documents');

const get = (slug: string) =>
  GET(new NextRequest(`https://gitranks.com/api/me/learn/lessons/${slug}`), { params: Promise.resolve({ slug }) });
const read = {
  depth: 'LEARNED',
  known: false,
  learnedAt: '2026-11-14T09:30:00.000Z',
  dueAt: null,
  picked: 1,
  language: 'python',
  tries: 1,
  feedbackGood: null,
};

describe("a lesson's personal side", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    current.session = null;
  });

  it('answers nothing signed out, without asking the API, and is never kept', async () => {
    const res = await get('sets');
    expect(await res.json()).toEqual({ mine: null });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("answers the signed-in person's side, as that person, with the language of the last answer", async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    graphqlDirect.mockResolvedValueOnce({ learnLessonMine: read });
    const res = await get('sets');
    expect(await res.json()).toEqual({ mine: read });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).toHaveBeenCalledWith(
      LearnLessonMineDocument,
      { slug: 'sets' },
      { source: 'ssr', githubLogin: 'octocat' },
    );
  });

  it('answers nothing when Learn is not open to them, on a failure, and for a slug of no shape', async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    graphqlDirect.mockResolvedValueOnce({ learnLessonMine: null });
    expect(await (await get('sets')).json()).toEqual({ mine: null });
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await (await get('sets')).json()).toEqual({ mine: null });
    graphqlDirect.mockClear();
    expect(await (await get('_gone')).json()).toEqual({ mine: null });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('treats a session the server could not read as signed out', async () => {
    current.session = {
      user: { githubLogin: 'octocat' },
      expires: '2099-01-01T00:00:00.000Z',
      error: 'RefreshFailed',
    } as unknown as Session;
    expect(await (await get('sets')).json()).toEqual({ mine: null });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});
