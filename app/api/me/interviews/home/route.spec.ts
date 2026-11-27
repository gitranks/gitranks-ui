import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, current } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  current: { session: null as Session | null },
}));

type Handler = (req: NextRequest & { auth: Session | null }, ctx: unknown) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }, ctx: unknown) => {
    req.auth = current.session;
    return handler(req, ctx);
  },
}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('server-only', () => ({}));

type Route = (req: NextRequest, ctx?: unknown) => Promise<Response>;
const { GET } = (await import('./route')) as unknown as { GET: Route };
const { InterviewsMyHomeDocument } = await import('@/lib/interviews/mine.documents');
const { myHomeTwo } = await import('@/lib/interviews/__fixtures__/mine');

const get = () => new NextRequest('https://gitranks.com/api/me/interviews/home');

beforeEach(() => {
  graphqlDirect.mockReset();
  current.session = null;
});

describe('/api/me/interviews/home', () => {
  it('is null signed out without asking the API, and never kept', async () => {
    const response = await GET(get());
    expect(await response.json()).toEqual({ home: null });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("is the API's answer for the session's person, and null when closed to them or on a failure", async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    graphqlDirect.mockResolvedValueOnce({ interviewsMyHome: myHomeTwo });
    const response = await GET(get());
    expect(await response.json()).toEqual({ home: myHomeTwo });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(graphqlDirect.mock.calls[0][0]).toBe(InterviewsMyHomeDocument);
    expect(graphqlDirect.mock.calls[0][2]).toMatchObject({ githubLogin: 'octocat' });
    graphqlDirect.mockResolvedValueOnce({ interviewsMyHome: null });
    expect(await (await GET(get())).json()).toEqual({ home: null });
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await (await GET(get())).json()).toEqual({ home: null });
  });

  it('is null for a session that needs a new sign-in', async () => {
    current.session = {
      user: { githubLogin: 'octocat' },
      error: 'RefreshTokenError',
      expires: '2099-01-01T00:00:00.000Z',
    } as unknown as Session;
    expect(await (await GET(get())).json()).toEqual({ home: null });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });
});
