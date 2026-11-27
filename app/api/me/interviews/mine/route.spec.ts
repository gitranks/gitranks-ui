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
const { GET: mine } = (await import('./route')) as unknown as { GET: Route };
const { InterviewsMineDocument } = await import('@/lib/interviews/mine.documents');
const { mineFull } = await import('@/lib/interviews/__fixtures__/mine');

const get = () => new NextRequest('https://gitranks.com/api/me/interviews/mine');

beforeEach(() => {
  graphqlDirect.mockReset();
  current.session = null;
});

describe('/api/me/interviews/mine', () => {
  it('is null signed out, without asking the API, and never kept', async () => {
    const response = await mine(get());
    expect(await response.json()).toEqual({ mine: null });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('is null for a session that needs a new sign-in, without asking the API', async () => {
    current.session = {
      user: { githubLogin: 'octocat' },
      error: 'RefreshTokenError',
      expires: '2099-01-01T00:00:00.000Z',
    } as Session;
    expect(await (await mine(get())).json()).toEqual({ mine: null });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("is the API's answer for the session's own person, and null when closed to them or on a failure", async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    graphqlDirect.mockResolvedValueOnce({ interviewsMine: mineFull });
    const response = await mine(get());
    expect(await response.json()).toEqual({ mine: mineFull });
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(graphqlDirect.mock.calls[0][0]).toBe(InterviewsMineDocument);
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });

    graphqlDirect.mockResolvedValueOnce({ interviewsMine: null });
    expect(await (await mine(get())).json()).toEqual({ mine: null });
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await (await mine(get())).json()).toEqual({ mine: null });
  });
});
