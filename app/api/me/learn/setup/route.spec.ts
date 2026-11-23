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
// The cached courses are not this route's: it reads the person's setup only.
vi.mock('@/lib/learn/course.data', () => ({ loadLearnCourse: vi.fn(), loadLearnCourses: vi.fn() }));

const { GET } = (await import('./route')) as unknown as { GET: (req: NextRequest) => Promise<Response> };
const { setupGuessed } = await import('@/lib/learn/__fixtures__/setup');

const get = () => GET(new NextRequest('https://gitranks.com/api/me/learn/setup'));
const signIn = (error?: string) => {
  current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z', error } as Session;
};

describe("Set up Learn's route", () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    current.session = null;
  });

  it('answers signed out without asking the API, and is never kept', async () => {
    const res = await get();
    expect(await res.json()).toEqual({ setup: null, signedOut: true });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('answers signed out for a session that needs a new sign-in', async () => {
    signIn('RefreshTokenError');
    expect(await (await get()).json()).toEqual({ setup: null, signedOut: true });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("answers the person's setup, and none when Learn is not open to them or the API fails", async () => {
    signIn();
    graphqlDirect.mockResolvedValueOnce({ learnSetupOfMine: setupGuessed });
    const res = await get();
    expect(await res.json()).toEqual({ setup: setupGuessed, signedOut: false });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'ssr', githubLogin: 'octocat' });

    graphqlDirect.mockResolvedValueOnce({ learnSetupOfMine: null });
    expect(await (await get()).json()).toEqual({ setup: null, signedOut: false });
    graphqlDirect.mockResolvedValueOnce({ learnSetupOfMine: { state: 'ODD' } });
    expect(await (await get()).json()).toEqual({ setup: null, signedOut: false });
    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await (await get()).json()).toEqual({ setup: null, signedOut: false });
  });
});
