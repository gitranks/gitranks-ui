import { type NextFetchEvent, NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const withSession = vi.fn(() => new Response(null, { headers: { 'set-cookie': 'authjs.csrf-token=x' } }));

vi.mock('next-auth', () => ({ default: () => ({ auth: () => withSession }) }));

const { default: proxy } = await import('./proxy');

const event = {} as NextFetchEvent;
const request = (cookie?: string, path = '/profile/torvalds') =>
  new NextRequest(`https://gitranks.com${path}`, cookie ? { headers: { cookie } } : undefined);

describe('proxy', () => {
  beforeEach(() => withSession.mockClear());

  it('lets a visitor without a session through untouched, so the page stays cacheable', async () => {
    const response = await proxy(request(), event);

    expect(withSession).not.toHaveBeenCalled();
    expect(response?.headers.get('set-cookie')).toBeNull();
  });

  it('treats the CSRF and callback-url cookies every anonymous browser carries as no session', async () => {
    await proxy(request('__Host-authjs.csrf-token=x; __Secure-authjs.callback-url=https%3A%2F%2Fgitranks.com'), event);

    expect(withSession).not.toHaveBeenCalled();
  });

  it.each([
    'authjs.session-token=t',
    '__Secure-authjs.session-token=t',
    '__Secure-authjs.session-token.0=a; __Secure-authjs.session-token.1=b',
  ])('runs Auth.js for a signed-in visitor and keeps the response out of shared caches (%s)', async (cookie) => {
    const response = await proxy(request(cookie), event);

    expect(withSession).toHaveBeenCalledTimes(1);
    expect(response?.headers.get('cache-control')).toBe('private, no-cache');
  });

  it.each([undefined, 'authjs.session-token=t'])(
    'rewrites an invalid ranking url to the 404 page on its own origin, before Auth.js (cookie: %s)',
    async (cookie) => {
      const response = await proxy(request(cookie, '/by/stars/99999'), event);

      expect(withSession).not.toHaveBeenCalled();
      expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/_404');
    },
  );
});
