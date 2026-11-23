import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { graphqlDirect, current } = vi.hoisted(() => ({
  graphqlDirect: vi.fn(),
  current: { session: null as Session | null },
}));

type Handler = (req: NextRequest & { auth: Session | null }) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }) => {
    req.auth = current.session;
    return handler(req);
  },
}));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('server-only', () => ({}));

const { GET } = (await import('./route')) as unknown as { GET: (req: NextRequest) => Promise<Response> };

const get = () => GET(new NextRequest('https://gitranks.com/api/me/learn/bar'));
const bar = { setup: 'SAVED', due: 6, pullRequests: true, pullRequestsNeedYou: 1 };

describe("Learn's bar route", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    current.session = null;
  });

  it('answers no bar signed out, without asking the API, and is never kept', async () => {
    const res = await get();
    expect(await res.json()).toEqual({ bar: null });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("answers the API's bar for the signed-in person, and none when the API fails", async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    graphqlDirect.mockResolvedValueOnce({ learnBar: bar });
    expect(await (await get()).json()).toEqual({ bar });
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });

    graphqlDirect.mockResolvedValueOnce({ learnBar: null });
    expect(await (await get()).json()).toEqual({ bar: null });

    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await (await get()).json()).toEqual({ bar: null });
  });
});
