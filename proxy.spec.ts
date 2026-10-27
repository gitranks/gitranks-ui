import { type NextFetchEvent, NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const withSession = vi.fn(() => new Response(null, { headers: { 'set-cookie': 'authjs.csrf-token=x' } }));

vi.mock('next-auth', () => ({ default: () => ({ auth: () => withSession }) }));

const { default: proxy, config } = await import('./proxy');

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

  it('clears a leftover session hint once the session is gone, without running Auth.js', async () => {
    const response = await proxy(request('has-session=1'), event);

    expect(withSession).not.toHaveBeenCalled();
    expect(response?.headers.get('set-cookie')).toBe('has-session=; Path=/; Max-Age=0; SameSite=Lax');
    expect(response?.headers.get('cache-control')).toBe('private, no-store');
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
    expect(response?.headers.getSetCookie()).toEqual([
      'authjs.csrf-token=x',
      'has-session=1; Path=/; Max-Age=2592000; SameSite=Lax',
    ]);
  });

  it.each([undefined, 'authjs.session-token=t'])(
    'rewrites an invalid ranking url to the 404 page on its own origin, before Auth.js (cookie: %s)',
    async (cookie) => {
      const response = await proxy(request(cookie, '/by/stars/99999'), event);

      expect(withSession).not.toHaveBeenCalled();
      expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/_404');
    },
  );

  describe('matcher', () => {
    const matches = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

    it.each([
      '/badges/torvalds/stars-rank.svg',
      '/repo-badges/vercel/next.js/star-history.svg',
      '/repo-badges/vercel/next.js/star-history.png',
    ])('leaves the always-anonymous badge %s alone', (path) => {
      expect(matches(path)).toBe(false);
    });

    it.each([
      '/logo-light.svg',
      '/logo-dark.svg',
      '/mark.svg',
      '/mark-mono.svg',
      '/favicon.ico',
      '/icon.svg',
      '/apple-icon.png',
    ])('leaves the brand asset %s alone', (path) => {
      expect(matches(path)).toBe(false);
    });

    it('still runs for the repository page', () => {
      expect(matches('/repo/vercel/next.js')).toBe(true);
    });
  });
});
