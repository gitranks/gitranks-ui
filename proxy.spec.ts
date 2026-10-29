import { type NextFetchEvent, NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const withSession = vi.fn(() => new Response(null, { headers: { 'set-cookie': 'authjs.csrf-token=x' } }));

vi.mock('next-auth', () => ({ default: () => ({ auth: () => withSession }) }));

const { maySeeContribute } = vi.hoisted(() => ({ maySeeContribute: vi.fn(async () => false) }));
vi.mock('./lib/contribute/preview-gate', () => ({ requestMaySeeContribute: maySeeContribute }));

const { default: proxy, config, ENTITY_PAGE_CACHE_CONTROL, v2BuilderRedirect } = await import('./proxy');

const event = {} as NextFetchEvent;
const request = (cookie?: string, path = '/profile/torvalds') =>
  new NextRequest(`https://gitranks.com${path}`, cookie ? { headers: { cookie } } : undefined);

describe('proxy', () => {
  beforeEach(() => {
    withSession.mockClear();
    maySeeContribute.mockReset();
    maySeeContribute.mockResolvedValue(false);
  });

  describe('Contribute', () => {
    it.each(['/contribute', '/contribute/connect', '/contribute/settings', '/contribute/issues'])(
      'answers %s with a 404 nobody caches, to anyone the API does not let in',
      async (path) => {
        for (const cookie of [undefined, 'authjs.session-token=t']) {
          const response = await proxy(request(cookie, path), event);

          expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/_404');
          expect(response?.headers.get('cache-control')).toBe('private, no-store');
        }
        expect(withSession).not.toHaveBeenCalled();
      },
    );

    it('lets in a signed-in user the API lets in, as any signed-in page', async () => {
      maySeeContribute.mockResolvedValue(true);
      const response = await proxy(request('authjs.session-token=t', '/contribute/settings'), event);

      expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
      expect(withSession).toHaveBeenCalledOnce();
      expect(response?.headers.get('cache-control')).toBe('private, no-cache');
    });

    it('asks nothing for the other pages', async () => {
      await proxy(request('authjs.session-token=t', '/contributors'), event);
      await proxy(request(undefined, '/by/stars/1'), event);

      expect(maySeeContribute).not.toHaveBeenCalled();
    });
  });

  it('lets a visitor without a session through untouched, so the page stays cacheable', async () => {
    const response = await proxy(request(undefined, '/by/stars/1'), event);

    expect(withSession).not.toHaveBeenCalled();
    expect(response?.headers.get('set-cookie')).toBeNull();
    expect(response?.headers.get('cache-control')).toBeNull();
  });

  it.each([
    '/profile/torvalds',
    '/profile/torvalds/ranks',
    '/org/vercel',
    '/repo/react/react',
    '/repo/facebook/react',
    '/insights/6650f0c2a1b2c3d4e5f60718',
  ])('keeps %s out of shared caches for a visitor without a session, setting no cookie', async (path) => {
    const response = await proxy(request(undefined, path), event);

    expect(withSession).not.toHaveBeenCalled();
    expect(response?.headers.get('set-cookie')).toBeNull();
    expect(response?.headers.get('cache-control')).toBe(ENTITY_PAGE_CACHE_CONTROL);
  });

  it.each([
    '/profile/wp-login.php',
    '/profile/-dash',
    '/profile/a_b/ranks',
    '/org/.env',
    '/org/x'.padEnd(45, 'x'),
    '/repo/x/a%20b',
    '/repo/-x/y',
    '/repo/x',
    '/insights/_',
    '/insights/123',
    '/insights/6650f0c2a1b2c3d4e5f6071z',
  ])('rewrites the impossible url %s to the 404 page before anything renders', async (path) => {
    for (const cookie of [undefined, 'authjs.session-token=t']) {
      const response = await proxy(request(cookie, path), event);

      expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/_404');
    }
    expect(withSession).not.toHaveBeenCalled();
  });

  it.each([
    '/profile/torvalds/ranks',
    '/org/vercel',
    '/repo/react/react',
    '/repo/x/.github',
    '/insights/6650F0C2A1B2C3D4E5F60718',
  ])('lets the well-formed url %s through to the page', async (path) => {
    const response = await proxy(request(undefined, path), event);

    expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
  });

  it.each(['/', '/insights', '/orgs/1', '/repos/1', '/profile', '/repository/x'])(
    'leaves %s to the page',
    async (path) => {
      const response = await proxy(request(undefined, path), event);

      expect(response?.headers.get('cache-control')).toBeNull();
    },
  );

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

  describe('old builder links', () => {
    const location = async (path: string, cookie?: string) => {
      const response = await proxy(request(cookie, path), event);
      const location = response?.headers.get('location');
      return { status: response?.status, location: location ? location.replace('https://gitranks.com', '') : null };
    };

    it.each<[string, string]>([
      ['/badge/builder/torvalds', '/badge/builder?user=torvalds&badge=rank&extra=none&scheme=classic&logo=0'],
      [
        '/badge/builder/torvalds?ranking=c&type=percentile&meta=monthly-change',
        '/badge/builder?user=torvalds&badge=rank&extra=top&by=contributions&scheme=classic&logo=0',
      ],
      [
        '/badge/builder?ranking=f&context=country&type=tier',
        '/badge/builder?user=&badge=tier&by=followers&scope=country&scheme=classic&logo=0',
      ],
      [
        '/badge/builder/octo-dev?type=position&meta=goal-top-10&labelBgColor=%23111111&label=my%20rank',
        '/badge/builder?user=octo-dev&badge=rank&extra=goal&scheme=custom&left=%23111111&right=%232282c2&logo=0&label=my+rank',
      ],
      [
        '/badge/builder/torvalds/?cornerStyle=squared',
        '/badge/builder?user=torvalds&badge=rank&extra=none&scheme=classic&logo=0',
      ],
    ])('sends %s to the new builder with its choices mapped', async (path, expected) => {
      expect(await location(path)).toEqual({ status: 308, location: expected });
      expect(withSession).not.toHaveBeenCalled();
    });

    it('redirects a signed-in visitor too, before Auth.js', async () => {
      expect((await location('/badge/builder/torvalds', 'authjs.session-token=t')).status).toBe(308);
      expect(withSession).not.toHaveBeenCalled();
    });

    it.each([
      '/badge/builder',
      '/badge/builder/',
      '/badge/builder?user=torvalds',
      '/badge/builder?repo=',
      '/badge/builder?user=torvalds&badge=rank&extra=top&scheme=night&step=embed',
      '/badge/builder?org=vercel&badge=contributors-wall&order=newest&rows=2',
      '/badge/gallery?type=tier',
      '/badges/torvalds/stars-rank.svg',
    ])('leaves the new builder link %s alone', async (path) => {
      expect(v2BuilderRedirect(new URL(`https://gitranks.com${path}`))).toBeNull();
      expect((await location(path)).status).not.toBe(308);
    });
  });

  describe('matcher', () => {
    const matches = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

    it.each([
      '/badges/torvalds/stars-rank.svg',
      '/repo-badges/vercel/next.js/star-history.svg',
      '/repo-badges/vercel/next.js/star-history.png',
      '/badge/user/torvalds/rank.svg',
      '/badge/org/vercel/org-card.png',
      '/badge/repo/vercel/next.js/star-history.svg',
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

    it.each(['/badge', '/badge/builder', '/badge/builder/torvalds', '/badge/gallery'])(
      'still runs for the badge page %s',
      (path) => {
        expect(matches(path)).toBe(true);
      },
    );
  });
});
