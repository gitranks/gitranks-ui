import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { signedFetch, revalidateTag, current, collections } = vi.hoisted(() => ({
  signedFetch: vi.fn(),
  revalidateTag: vi.fn(),
  current: { session: null as Session | null },
  collections: {
    accounts: { deleteMany: vi.fn() },
    users: { deleteOne: vi.fn() },
  },
}));

type Handler = (req: NextRequest & { auth: Session | null }) => unknown;

vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }) => {
    req.auth = current.session;
    return handler(req);
  },
}));
vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));
vi.mock('next/cache', () => ({ revalidateTag }));
vi.mock('@/lib/mongo-client', () => ({
  default: Promise.resolve({ db: () => ({ collection: (name: 'accounts' | 'users') => collections[name] }) }),
}));

const { GET, POST } = (await import('./route')) as unknown as {
  GET: (req: NextRequest) => Promise<Response>;
  POST: (req: NextRequest) => Promise<Response>;
};

const USER_ID = '65f1a2b3c4d5e6f708192a3b';

const signIn = (githubLogin: string) => {
  current.session = { user: { githubLogin, id: USER_ID }, expires: '2099-01-01T00:00:00.000Z' };
};

const post = (body: unknown) =>
  POST(new NextRequest('https://gitranks.com/api/me/data-removal', { method: 'POST', body: JSON.stringify(body) }));

const upstream = (status: number, body: unknown) =>
  signedFetch.mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );

describe('data removal route', () => {
  beforeEach(() => {
    signedFetch.mockReset();
    revalidateTag.mockReset();
    collections.accounts.deleteMany.mockReset();
    collections.users.deleteOne.mockReset();
    current.session = null;
  });

  it('refuses a signed-out caller, without asking the API or touching sign-ins', async () => {
    expect((await GET(new NextRequest('https://gitranks.com/api/me/data-removal'))).status).toBe(401);
    expect((await post({ confirm: 'octocat' })).status).toBe(401);
    expect(signedFetch).not.toHaveBeenCalled();
    expect(collections.accounts.deleteMany).not.toHaveBeenCalled();
  });

  it('reads the status as the signed-in user', async () => {
    signIn('OctoCat');
    upstream(200, { removed: false });

    const response = await GET(new NextRequest('https://gitranks.com/api/me/data-removal'));

    expect(await response.json()).toEqual({ removed: false });
    expect(signedFetch).toHaveBeenCalledWith('/user-removal/status', {}, 'client', 'OctoCat');
  });

  it.each([[{}], [{ confirm: 'someone-else' }], [{ confirm: 7 }]])(
    'removes nothing without the signed-in login typed in: %j',
    async (body) => {
      signIn('OctoCat');
      expect((await post(body)).status).toBe(400);
      expect(signedFetch).not.toHaveBeenCalled();
    },
  );

  it("removes the signed-in user's data, then this sign-in's own rows, and expires the profile", async () => {
    signIn('OctoCat');
    upstream(200, { status: 'removed', login: 'octocat', profile: true });

    const response = await post({ confirm: ' octocat ' });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'removed', profile: true });
    expect(signedFetch).toHaveBeenCalledWith(
      '/user-removal',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ confirm: 'octocat' }) }),
      'client',
      'OctoCat',
    );
    const [[accountsFilter]] = collections.accounts.deleteMany.mock.calls;
    expect(String(accountsFilter.userId)).toBe(USER_ID);
    expect(String(collections.users.deleteOne.mock.calls[0][0]._id)).toBe(USER_ID);
    expect(revalidateTag).toHaveBeenCalledWith('profile:OctoCat', { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith('profile:octocat', { expire: 0 });
  });

  it('keeps the sign-in when the API refused the removal', async () => {
    signIn('OctoCat');
    upstream(502, { message: 'down' });

    expect((await post({ confirm: 'OctoCat' })).status).toBe(502);
    expect(collections.accounts.deleteMany).not.toHaveBeenCalled();
    expect(collections.users.deleteOne).not.toHaveBeenCalled();
  });
});
