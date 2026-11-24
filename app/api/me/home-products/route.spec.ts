import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { homeProducts } from '@/app/components/landing/__fixtures__/products-block';

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

const get = () => GET(new NextRequest('https://gitranks.com/api/me/home-products'));

describe('the home block route', () => {
  beforeEach(() => {
    graphqlDirect.mockReset();
    current.session = null;
  });

  it('answers no cards signed out, without asking the API, and is never kept', async () => {
    const res = await get();
    expect(await res.json()).toEqual({ products: null });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('answers no cards for a session in error', async () => {
    current.session = { user: { githubLogin: 'octocat' }, error: 'RefreshTokenError' } as unknown as Session;
    expect(await (await get()).json()).toEqual({ products: null });
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it("answers the signed-in person's cards, and none when the API fails", async () => {
    current.session = { user: { githubLogin: 'octocat' }, expires: '2099-01-01T00:00:00.000Z' } as Session;
    graphqlDirect.mockResolvedValueOnce({ homeProducts: homeProducts.both });
    const res = await get();
    expect(await res.json()).toEqual({ products: homeProducts.both });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(graphqlDirect.mock.calls[0][2]).toEqual({ source: 'client', githubLogin: 'octocat' });

    graphqlDirect.mockRejectedValueOnce(new Error('down'));
    expect(await (await get()).json()).toEqual({ products: null });
  });
});
