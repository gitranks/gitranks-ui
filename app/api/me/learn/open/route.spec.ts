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

const { GET } = (await import('./route')) as unknown as { GET: (req: NextRequest) => Promise<Response> };
const { learnOpenInBrowser, learnOpenKnown, resetLearnOpenInBrowser } = await import('@/lib/learn/learn-open');

const get = () => GET(new NextRequest('https://gitranks.com/api/me/learn/open'));

describe("the menu's Learn route", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    current.session = null;
  });

  it('answers closed signed out, without asking the API, never kept by a shared cache', async () => {
    const res = await get();
    expect(await res.json()).toEqual({ open: false });
    expect(res.headers.get('cache-control')).toBe('private, max-age=60');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("answers the API's learnOpen for the signed-in viewer, closed when the API does not know it", async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    graphqlDirect.mockResolvedValueOnce({ learnOpen: true });
    expect(await (await get()).json()).toEqual({ open: true });
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });

    graphqlDirect.mockRejectedValueOnce(new Error('[{"message":"Cannot query field \\"learnOpen\\""}]'));
    expect(await (await get()).json()).toEqual({ open: false });
  });
});

describe('Learn open, in the browser', () => {
  beforeEach(() => {
    resetLearnOpenInBrowser();
    vi.unstubAllGlobals();
  });

  it('asks once per login, and remembers the answer', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ open: true })));
    vi.stubGlobal('fetch', fetch);
    expect(learnOpenKnown('octocat')).toBeUndefined();
    expect(await Promise.all([learnOpenInBrowser('octocat'), learnOpenInBrowser('octocat')])).toEqual([true, true]);
    expect(fetch).toHaveBeenCalledOnce();
    expect(learnOpenKnown('octocat')).toBe(true);
  });

  it('is closed without a login, on an error answer and when the request fails', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    expect(await learnOpenInBrowser(null)).toBe(false);
    expect(fetch).not.toHaveBeenCalled();

    fetch.mockResolvedValueOnce(new Response('', { status: 500 }));
    expect(await learnOpenInBrowser('a')).toBe(false);
    fetch.mockRejectedValueOnce(new Error('offline'));
    expect(await learnOpenInBrowser('b')).toBe(false);
  });
});
