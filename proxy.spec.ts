import { type NextFetchEvent, NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const withSession = vi.fn(() => new Response(null, { headers: { 'set-cookie': 'authjs.csrf-token=x' } }));

vi.mock('next-auth', () => ({ default: () => ({ auth: () => withSession }) }));

const { maySeeContribute, settingUp, open, sessionRead } = vi.hoisted(() => ({
  maySeeContribute: vi.fn(async (_req?: unknown) => false),
  settingUp: vi.fn(async () => false),
  open: vi.fn(async () => false),
  // Whether the session the request carries can be read (not expired).
  sessionRead: { ok: true },
}));
vi.mock('./lib/workspace/preview-gate', () => {
  const access = async (req: unknown) =>
    (await maySeeContribute(req)) ? 'allowed' : (await settingUp()) ? 'setting-up' : 'hidden';
  return {
    requestContributeAccess: access,
    requestWorkspaceAccess: async (req: unknown) => (sessionRead.ok ? access(req) : 'signed-out'),
    contributeOpen: open,
  };
});
const { ledgerOpen } = vi.hoisted(() => ({ ledgerOpen: vi.fn(async () => false) }));
vi.mock('./lib/contribute/ledger-gate', () => ({ contributeLedgerOpen: ledgerOpen }));
const { timelineGate } = vi.hoisted(() => ({
  timelineGate: vi.fn(async (_pr: unknown): Promise<unknown> => ({ kind: 'page', partial: false, confirmed: true })),
}));
vi.mock('./lib/contribute/pr-timeline-gate', () => ({ prTimelineGateOf: timelineGate }));
const { lessonGate } = vi.hoisted(() => ({
  lessonGate: vi.fn(async (_route: unknown): Promise<unknown> => ({ kind: 'page' })),
}));
// Learn is not open to everyone: a visitor's /learn stays a 404.
vi.mock('./lib/learn/learn-everyone', () => ({ learnOpenToEveryone: async () => false }));
// Learn for the request's signed-in viewer, as the API answers it.
const { learnAccess } = vi.hoisted(() => ({
  learnAccess: vi.fn(async (_req?: unknown): Promise<'open' | 'closed' | 'signed-out'> => 'open'),
}));
vi.mock('./lib/workspace/gate', () => ({ requestLearnAccess: learnAccess }));
vi.mock('./lib/learn/lesson-gate', () => ({
  LESSON_MISSING_PATH: '/learn/lessons/_missing',
  lessonGateOf: lessonGate,
}));
vi.mock('./lib/learn/public-progress/progress-gate', () => ({ progressGateOf: async () => 'page' }));
const { courseGate } = vi.hoisted(() => ({
  courseGate: vi.fn(async (_slug: unknown): Promise<unknown> => ({ kind: 'page' })),
}));
vi.mock('./lib/learn/course-gate', () => ({ courseGateOf: courseGate }));

const {
  default: proxy,
  config,
  ENTITY_PAGE_CACHE_CONTROL,
  repoOverviewRewriteOf,
  v2BuilderRedirect,
} = await import('./proxy');

const event = {} as NextFetchEvent;
const request = (cookie?: string, path = '/profile/torvalds') =>
  new NextRequest(`https://gitranks.com${path}`, cookie ? { headers: { cookie } } : undefined);

describe('proxy', () => {
  beforeEach(() => {
    withSession.mockClear();
    maySeeContribute.mockReset();
    maySeeContribute.mockResolvedValue(false);
    settingUp.mockReset();
    settingUp.mockResolvedValue(false);
    open.mockReset();
    open.mockResolvedValue(false);
    ledgerOpen.mockReset();
    ledgerOpen.mockResolvedValue(false);
    timelineGate.mockReset();
    timelineGate.mockResolvedValue({ kind: 'page', partial: false, confirmed: true });
    lessonGate.mockReset();
    lessonGate.mockResolvedValue({ kind: 'page' });
    courseGate.mockReset();
    courseGate.mockResolvedValue({ kind: 'page' });
    sessionRead.ok = true;
  });

  describe('packages', () => {
    const PACKAGE_PATHS = [
      '/package/npm/react',
      '/package/npm/@types/node',
      '/packages',
      '/packages/npm',
      '/packages/npm/downloads/1',
      '/packages/npm/dependents-stars/51',
      '/packages/npm/dependents/2',
      '/methodology/packages',
      '/repo/facebook/react/used-by',
      '/repo/facebook/react/used-by/',
      '/repo/facebook/react/contributors',
    ];
    const SIGNED_IN = 'authjs.session-token=t';

    it.each(PACKAGE_PATHS)('lets everyone through to %s', async (path) => {
      const signedOut = await proxy(request(undefined, path), event);
      expect(signedOut?.headers.get('x-middleware-rewrite')).toBeNull();

      const signedIn = await proxy(request(SIGNED_IN, path), event);
      expect(signedIn?.headers.get('x-middleware-rewrite')).toBeNull();
      expect(signedIn?.headers.get('cache-control')).toBe('private, no-cache');
    });

    it("keeps a package's page out of shared caches for a visitor without a session, as a repository's", async () => {
      const page = await proxy(request(undefined, '/package/npm/react'), event);
      expect(page?.headers.get('cache-control')).toBe(ENTITY_PAGE_CACHE_CONTROL);
      expect(page?.headers.get('set-cookie')).toBeNull();

      const ranking = await proxy(request(undefined, '/packages/npm/downloads/1'), event);
      expect(ranking?.headers.get('cache-control')).toBeNull();
    });

    it("answers a package's facts in markdown from the packages API route", async () => {
      const open = await proxy(request(undefined, '/package/npm/@types/node/facts.md'), event);
      expect(open?.headers.get('x-middleware-rewrite')).toBe(
        'https://gitranks.com/api/packages/npm/@types/node/facts.md',
      );
      expect(withSession).not.toHaveBeenCalled();

      const page = await proxy(request(undefined, '/package/npm/@acme/facts.md'), event);
      expect(page?.headers.get('x-middleware-rewrite')).toBeNull();
    });

    describe("a repository's own page", () => {
      const REPO_PAGES = ['/repo/facebook/react', '/repo/facebook/react/'];
      const OVERVIEW = 'https://gitranks.com/repo/facebook/react/overview';

      it.each(REPO_PAGES)(
        'is the tabbed Overview for everyone, with the headers a repository page has: %s',
        async (path) => {
          const signedOut = await proxy(request(undefined, path), event);
          expect(signedOut?.headers.get('x-middleware-rewrite')).toBe(OVERVIEW);
          expect(signedOut?.headers.get('cache-control')).toBe(ENTITY_PAGE_CACHE_CONTROL);
          expect(signedOut?.headers.get('set-cookie')).toBeNull();

          const hinted = await proxy(request('has-session=1', path), event);
          expect(hinted?.headers.get('x-middleware-rewrite')).toBe(OVERVIEW);
          expect(hinted?.headers.get('cache-control')).toBe('private, no-store');
          expect(hinted?.headers.get('set-cookie')).toContain('has-session=;');

          const signedIn = await proxy(request(SIGNED_IN, path), event);
          expect(signedIn?.headers.get('x-middleware-rewrite')).toBe(OVERVIEW);
          expect(signedIn?.headers.get('cache-control')).toBe('private, no-cache');
          expect(signedIn?.headers.get('set-cookie')).toContain('has-session=1');
          expect(withSession).not.toHaveBeenCalled();
        },
      );

      it("keeps an RSC or prefetch request's query on the rewrite", async () => {
        const rsc = new NextRequest('https://gitranks.com/repo/facebook/react?_rsc=1x2y3', {
          headers: {
            cookie: SIGNED_IN,
            RSC: '1',
            'Next-Router-Prefetch': '1',
            'Next-Router-State-Tree': '%5B%22%22%5D',
          },
        });

        const response = await proxy(rsc, event);
        expect(response?.headers.get('x-middleware-rewrite')).toBe(`${OVERVIEW}?_rsc=1x2y3`);
      });

      it('rewrites only the repository page itself, never its tabs or an impossible name', async () => {
        for (const path of [
          '/repo/facebook/react/used-by',
          '/repo/facebook/react/contributors',
          '/repos/1',
          '/repo/x',
        ]) {
          const response = await proxy(request(undefined, path), event);
          expect(response?.headers.get('x-middleware-rewrite') ?? '', path).not.toContain('/overview');
        }
        const impossible = await proxy(request(undefined, '/repo/-x/y'), event);
        expect(impossible?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/_404');
      });
    });

    it('names the tabbed Overview for a repository page alone', () => {
      expect(repoOverviewRewriteOf('/repo/facebook/react')).toBe('/repo/facebook/react/overview');
      expect(repoOverviewRewriteOf('/repo/facebook/react/')).toBe('/repo/facebook/react/overview');
      for (const path of ['/repo/facebook', '/repo/facebook/react/used-by', '/repos/facebook/react', '/repo//react']) {
        expect(repoOverviewRewriteOf(path), path).toBeNull();
      }
    });

    it.each([
      '/repo/facebook/react/overview',
      '/repo/facebook/react/Used-By',
      '/repo/facebook/react/used-by/x',
      '/packages/npm/downloads',
      '/packages/npm/downloads/0',
      '/packages/npm/downloads/52',
      '/packages/npm/stars/1',
      '/packages/cargo/downloads/1',
      '/package/cargo/serde',
      '/package/pypi/zope/interface',
      '/package/pypi/-x',
      '/package/npm/.env',
      '/package/npm/_private',
      '/package/npm/a%20b',
      '/package/npm/@types',
      '/package/npm/react/extra',
      `/package/npm/${'x'.repeat(215)}`,
    ])('answers %s with a 404', async (path) => {
      for (const cookie of [undefined, SIGNED_IN]) {
        const response = await proxy(request(cookie, path), event);
        expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/_404');
      }
      expect(withSession).not.toHaveBeenCalled();
    });
  });

  describe('Contribute', () => {
    it.each([
      '/contribute',
      '/contribute/about',
      '/contribute/connect',
      '/contribute/settings',
      '/contribute/issues',
      '/contribute/mcp',
      '/contribute/faq',
    ])('answers %s with a 404 nobody caches, to anyone the API does not let in', async (path) => {
      for (const cookie of [undefined, 'authjs.session-token=t']) {
        const response = await proxy(request(cookie, path), event);

        expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/_404');
        expect(response?.headers.get('cache-control')).toBe('private, no-store');
      }
      expect(withSession).not.toHaveBeenCalled();
    });

    it('once launched, lets everyone see the landing, the MCP docs and the questions, a visitor without a session as any signed-out page', async () => {
      open.mockResolvedValue(true);
      for (const path of [
        '/contribute',
        '/contribute/',
        '/contribute?as=visitor',
        '/contribute/about',
        '/contribute/mcp',
        '/contribute/faq',
      ]) {
        const signedOut = await proxy(request(undefined, path), event);
        expect(signedOut?.headers.get('x-middleware-rewrite'), path).toBeNull();
        expect(signedOut?.headers.get('cache-control'), path).toBeNull();
      }
      const signedIn = await proxy(request('authjs.session-token=t', '/contribute'), event);
      expect(signedIn?.headers.get('x-middleware-rewrite')).toBeNull();
      expect(signedIn?.headers.get('cache-control')).toBe('private, no-cache');
      expect(maySeeContribute).not.toHaveBeenCalled();
    });

    describe('the landing for agents (markdown)', () => {
      const md = (accept: string, cookie?: string) =>
        new NextRequest('https://gitranks.com/contribute', {
          headers: { accept, ...(cookie ? { cookie } : {}) },
        });

      it('rewrites to the markdown when Accept prefers it, never kept by a shared cache', async () => {
        open.mockResolvedValue(true);
        for (const cookie of [undefined, 'authjs.session-token=t']) {
          const response = await proxy(md('text/markdown, */*;q=0.1', cookie), event);
          expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/contribute/agents.md');
          expect(response?.headers.get('vary')).toBe('Accept');
          expect(response?.headers.get('cache-control')).toBe('private, no-cache');
        }
        expect(withSession).not.toHaveBeenCalled();
      });

      it('serves the HTML with the Link header and Vary on every branch', async () => {
        open.mockResolvedValue(true);
        for (const cookie of [undefined, 'has-session=1', 'authjs.session-token=t']) {
          const response = await proxy(md('text/html,*/*;q=0.8', cookie), event);
          expect(response?.headers.get('x-middleware-rewrite'), cookie).toBeNull();
          expect(response?.headers.get('link'), cookie).toBe(
            '</contribute/agents.md>; rel="alternate"; type="text/markdown"',
          );
          expect(response?.headers.get('vary'), cookie).toContain('Accept');
        }
      });

      it('keeps the 404 before the launch, for markdown too', async () => {
        const response = await proxy(md('text/markdown'), event);
        expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/_404');
      });

      it('opens /contribute/agents.md with the landing', async () => {
        open.mockResolvedValue(true);
        const response = await proxy(request(undefined, '/contribute/agents.md'), event);
        expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
      });
    });

    it("keeps what is left under a contribution's old address behind the gate (the address itself redirects first)", async () => {
      for (const path of ['/contribute/attempts', '/contribute/attempts/A_1/files', '/contribute/attempts/A_1/runs']) {
        const response = await proxy(request(undefined, path), event);
        expect(response?.headers.get('x-middleware-rewrite'), path).toBe('https://gitranks.com/_404');
      }
    });

    it('keeps the markdown twin and its Link header to the landing, not how Contribute works', async () => {
      open.mockResolvedValue(true);
      const about = await proxy(
        new NextRequest('https://gitranks.com/contribute/about', { headers: { accept: 'text/markdown' } }),
        event,
      );
      expect(about?.headers.get('x-middleware-rewrite')).toBeNull();
      expect(about?.headers.get('link')).toBeNull();
    });

    it('once launched, keeps every other Contribute page for signed-in users the API lets in', async () => {
      open.mockResolvedValue(true);
      for (const path of ['/contribute/connect', '/contribute/issues', '/contribute/settings', '/contribute%2Fme']) {
        const response = await proxy(request(undefined, path), event);
        expect(response?.headers.get('x-middleware-rewrite'), path).toBe('https://gitranks.com/_404');
      }
      expect(open).not.toHaveBeenCalled();
    });

    it("sends a new account being set up to Contribute's home, with the way it picked, never cached", async () => {
      settingUp.mockResolvedValue(true);
      for (const [path, to] of [
        ['/contribute/issues', 'https://gitranks.com/contribute'],
        ['/contribute/settings', 'https://gitranks.com/contribute'],
      ]) {
        const response = await proxy(request('authjs.session-token=t', path), event);
        expect(response?.headers.get('location'), path).toBe(to);
        expect(response?.headers.get('cache-control'), path).toBe('private, no-store');
      }
    });

    describe('the steps of Contribute’s flow', () => {
      const STEPS = [
        '/contribute/start',
        '/contribute/start?languages=go&kinds=bug',
        '/contribute/start/agent',
        '/contribute/start/agent/own?from=agent',
        '/contribute/start/agent/key',
        '/contribute/start/issue',
      ];

      it('once launched, are open to a visitor as the landing is: nothing asked about them, no cookie set', async () => {
        open.mockResolvedValue(true);
        for (const path of STEPS) {
          const response = await proxy(request(undefined, path), event);
          expect(response?.headers.get('x-middleware-rewrite'), path).toBeNull();
          expect(response?.headers.get('location'), path).toBeNull();
          expect(response?.headers.get('cache-control'), path).toBeNull();
          expect(response?.headers.get('set-cookie'), path).toBeNull();
          // The landing's markdown twin stays the landing's own.
          expect(response?.headers.get('link'), path).toBeNull();
        }
        expect(maySeeContribute).not.toHaveBeenCalled();
        expect(withSession).not.toHaveBeenCalled();
      });

      it('before the launch, answer a visitor and an account off the preview with the 404 nobody caches', async () => {
        for (const cookie of [undefined, 'authjs.session-token=t']) {
          for (const path of STEPS) {
            const response = await proxy(request(cookie, path), event);
            expect(response?.headers.get('x-middleware-rewrite'), path).toBe('https://gitranks.com/_404');
            expect(response?.headers.get('cache-control'), path).toBe('private, no-store');
          }
        }
      });

      it('keep a new account being set up on the step, its answers in the address, before the launch and after', async () => {
        settingUp.mockResolvedValue(true);
        for (const launched of [false, true]) {
          open.mockResolvedValue(launched);
          for (const path of STEPS) {
            const response = await proxy(request('authjs.session-token=t', path), event);
            expect(response?.headers.get('location'), path).toBeNull();
            expect(response?.headers.get('x-middleware-rewrite'), path).toBeNull();
            expect(response?.headers.get('cache-control'), path).toBe('private, no-cache');
          }
        }
      });
    });

    it('lets the home itself through for an account being set up before the launch, which says so there', async () => {
      settingUp.mockResolvedValue(true);
      const response = await proxy(request('authjs.session-token=t', '/contribute'), event);

      expect(response?.headers.get('location')).toBeNull();
      expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
    });

    it('lets in a signed-in user the API lets in, as any signed-in page', async () => {
      maySeeContribute.mockResolvedValue(true);
      const response = await proxy(request('authjs.session-token=t', '/contribute/settings'), event);

      expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
      expect(withSession).toHaveBeenCalledOnce();
      expect(response?.headers.get('cache-control')).toBe('private, no-cache');
    });

    describe('pull request timelines', () => {
      const PAGE = '/contribute/pr/acme/widgets/42';

      it('a shown page goes on, signed out, past the Contribute gate', async () => {
        const response = await proxy(request(undefined, PAGE), event);
        expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
        expect(response?.status).toBe(200);
        expect(timelineGate).toHaveBeenCalledWith({ nameWithOwner: 'acme/widgets', number: 42 });
        expect(maySeeContribute).not.toHaveBeenCalled();
      });

      it('a shown page says where its Markdown twin is', async () => {
        const response = await proxy(request(undefined, PAGE), event);
        expect(response?.headers.get('link')).toBe(`<${PAGE}/timeline.md>; rel="alternate"; type="text/markdown"`);
        const twin = await proxy(request(undefined, `${PAGE}/timeline.md`), event);
        expect(twin?.headers.get('link')).toBeNull();
        timelineGate.mockResolvedValueOnce({ kind: 'page', partial: false, confirmed: false });
        const unconfirmed = await proxy(request(undefined, PAGE), event);
        expect(unconfirmed?.headers.get('link')).toBeNull();
      });

      it('a signed-in visitor gets the same page, asked about signed out', async () => {
        const response = await proxy(request('authjs.session-token=t', PAGE), event);
        expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
        expect(timelineGate).toHaveBeenCalledWith({ nameWithOwner: 'acme/widgets', number: 42 });
      });

      it('a missing page is a 404, a moved one a 307 to its address now, neither kept', async () => {
        timelineGate.mockResolvedValueOnce({ kind: 'missing' });
        const missing = await proxy(request(undefined, PAGE), event);
        expect(missing?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/_404');
        expect(missing?.headers.get('cache-control')).toBe('private, no-store');
        timelineGate.mockResolvedValueOnce({ kind: 'redirect', path: '/contribute/pr/acme/gadgets/42' });
        const moved = await proxy(request(undefined, `${PAGE}/timeline.md?utm_source=x`), event);
        expect(moved?.status).toBe(307);
        expect(moved?.headers.get('cache-control')).toBe('private, no-store');
        expect(moved?.headers.get('location')).toBe(
          'https://gitranks.com/contribute/pr/acme/gadgets/42/timeline.md?utm_source=x',
        );
      });

      it('the short address skips every gate: its route handler answers', async () => {
        const response = await proxy(request(undefined, '/contribute/pr/6728f0c2a1b2c3d4e5f60718'), event);
        expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
        expect(maySeeContribute).not.toHaveBeenCalled();
        expect(timelineGate).not.toHaveBeenCalled();
      });
    });

    describe('the ledger (its own switch)', () => {
      it('answers a visitor without a session with a 404 nobody caches while it is closed', async () => {
        for (const path of ['/contribute/ledger', '/contribute/ledger/']) {
          const response = await proxy(request(undefined, path), event);
          expect(response?.headers.get('x-middleware-rewrite'), path).toBe('https://gitranks.com/_404');
          expect(response?.headers.get('cache-control'), path).toBe('private, no-store');
        }
        expect(maySeeContribute).not.toHaveBeenCalled();
      });

      it('lets a signed-in visitor through to the page, which asks the API, while it is closed', async () => {
        const response = await proxy(request('authjs.session-token=t', '/contribute/ledger'), event);
        expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
        expect(response?.headers.get('cache-control')).toBe('private, no-cache');
        expect(maySeeContribute).not.toHaveBeenCalled();
      });

      it('lets everyone in once public, whatever the Contribute preview says', async () => {
        ledgerOpen.mockResolvedValue(true);
        const response = await proxy(request(undefined, '/contribute/ledger'), event);
        expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
        expect(open).not.toHaveBeenCalled();
        expect(maySeeContribute).not.toHaveBeenCalled();
      });
    });

    it('lets everyone reach the page for maintainers and its report page, without asking who may see Contribute', async () => {
      for (const path of [
        '/contribute/maintainers',
        '/contribute/maintainers/',
        '/contribute/maintainers/report',
        '/contribute/maintainers/report/',
        '/Contribute/Maintainers/Report',
        '/contribute//maintainers//report',
      ]) {
        const signedOut = await proxy(request(undefined, path), event);
        expect(signedOut?.headers.get('x-middleware-rewrite')).toBeNull();

        const signedIn = await proxy(request('authjs.session-token=t', path), event);
        expect(signedIn?.headers.get('x-middleware-rewrite')).toBeNull();
        expect(signedIn?.headers.get('cache-control')).toBe('private, no-cache');
      }
      expect(maySeeContribute).not.toHaveBeenCalled();
    });

    it("lets everyone reach the agent sign-in's consent page, which says itself who may allow it", async () => {
      for (const path of ['/contribute/authorize', '/contribute/authorize/']) {
        const signedOut = await proxy(request(undefined, path), event);
        expect(signedOut?.headers.get('x-middleware-rewrite')).toBeNull();

        const signedIn = await proxy(request('authjs.session-token=t', path), event);
        expect(signedIn?.headers.get('x-middleware-rewrite')).toBeNull();
        expect(signedIn?.headers.get('cache-control')).toBe('private, no-cache');
      }
      expect(maySeeContribute).not.toHaveBeenCalled();

      const under = await proxy(request(undefined, '/contribute/authorize/x'), event);
      expect(under?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/_404');
    });

    it('keeps everything under the page for maintainers, and the other pages, behind the gate', async () => {
      for (const path of [
        '/contribute/maintainers/x',
        '/contribute/maintainers%2F..%2Fsettings',
        '/contribute/maintainers/report/x',
        '/contribute/maintainers/reports',
        '/contribute/maintainers/report%2F..%2F..%2Fme',
        '/contribute/maintainers/%E0%A4%A',
        '/contribute/me',
      ]) {
        const response = await proxy(request(undefined, path), event);
        expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/_404');
      }
    });

    it('asks nothing for the other pages', async () => {
      await proxy(request('authjs.session-token=t', '/contributors'), event);
      await proxy(request(undefined, '/by/stars/1'), event);

      expect(maySeeContribute).not.toHaveBeenCalled();
    });
  });

  describe("the workspace's pages under /my", () => {
    const PAGES = ['/my/pull-requests', '/my/agent', '/my/agent/connect', '/my/settings/work', '/MY//Settings'];

    it('lets a visitor without a session through to the sign-in, asked about nothing and never cached', async () => {
      for (const path of PAGES) {
        const response = await proxy(request(undefined, path), event);
        expect(response?.headers.get('x-middleware-rewrite'), path).toBeNull();
        expect(response?.headers.get('location'), path).toBeNull();
        expect(response?.headers.get('cache-control'), path).toBe('private, no-store');
      }
      expect(maySeeContribute).not.toHaveBeenCalled();
      expect(withSession).not.toHaveBeenCalled();
    });

    it.each([
      '/my/pull-requests/by-attempt/A_1',
      '/my/pull-requests/by-attempt/A_1?session=next&resume=n0nce',
      '/MY//pull-requests/by-attempt/A_1/',
    ])('shows a visitor the sign-in on the address by attempt %s itself, so it comes back there', async (path) => {
      const response = await proxy(request(undefined, path), event);
      expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/my/pull-requests');
      expect(response?.headers.get('location')).toBeNull();
      expect(response?.headers.get('cache-control')).toBe('private, no-store');
      expect(maySeeContribute).not.toHaveBeenCalled();
    });

    it('shows the sign-in on the address by attempt to a session the server cannot read, and lets a signed-in one on', async () => {
      sessionRead.ok = false;
      const expired = await proxy(request('authjs.session-token=t', '/my/pull-requests/by-attempt/A_1'), event);
      expect(expired?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/my/pull-requests');
      sessionRead.ok = true;
      maySeeContribute.mockResolvedValue(true);
      const signedIn = await proxy(request('authjs.session-token=t', '/my/pull-requests/by-attempt/A_1'), event);
      expect(signedIn?.headers.get('x-middleware-rewrite')).toBeNull();
    });

    it("lets a session the server cannot read through to the sign-in, as a visitor's", async () => {
      sessionRead.ok = false;
      const response = await proxy(request('authjs.session-token=t', '/my/settings'), event);
      expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
      expect(maySeeContribute).not.toHaveBeenCalled();
    });

    it('answers a signed-in account the workspace is hidden from with a 404 nobody caches', async () => {
      for (const path of PAGES) {
        const response = await proxy(request('authjs.session-token=t', path), event);
        expect(response?.headers.get('x-middleware-rewrite'), path).toBe('https://gitranks.com/_404');
        expect(response?.headers.get('cache-control'), path).toBe('private, no-store');
      }
      expect(withSession).not.toHaveBeenCalled();
    });

    it("sends an account being set up to the connect step of Contribute's flow, else home, never cached", async () => {
      settingUp.mockResolvedValue(true);
      for (const [path, to] of [
        ['/my/agent/connect', 'https://gitranks.com/contribute/start/agent/own'],
        ['/my/agent/connect?proof=A_1', 'https://gitranks.com/contribute/start/agent/own?proof=A_1'],
        ['/my/agent/key', 'https://gitranks.com/contribute/start/agent/key'],
        ['/my/settings', 'https://gitranks.com/contribute'],
        ['/my/pull-requests', 'https://gitranks.com/contribute'],
      ]) {
        const response = await proxy(request('authjs.session-token=t', path), event);
        expect(response?.headers.get('location'), path).toBe(to);
        expect(response?.headers.get('cache-control'), path).toBe('private, no-store');
      }
    });

    it('lets in a signed-in user the API lets in, as any signed-in page', async () => {
      maySeeContribute.mockResolvedValue(true);
      const response = await proxy(request('authjs.session-token=t', '/my/agent'), event);
      expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
      expect(withSession).toHaveBeenCalledOnce();
      expect(response?.headers.get('cache-control')).toBe('private, no-cache');
    });

    it("asks nothing for a page's own actions (a POST), and nothing for a path that only starts with my", async () => {
      const post = new NextRequest('https://gitranks.com/my/settings', {
        method: 'POST',
        headers: { cookie: 'authjs.session-token=t' },
      });
      await proxy(post, event);
      await proxy(request(undefined, '/myself'), event);
      expect(maySeeContribute).not.toHaveBeenCalled();
    });
  });

  describe("a fair-use message's answer page", () => {
    const PAGES = ['/contribute/answer/583231-outsidePr-1-1', '/Contribute//answer/a%2Fb%3D-viewing-2-7'];

    it('lets a visitor without a session through to the sign-in, before the launch too, never cached', async () => {
      for (const path of PAGES) {
        const response = await proxy(request(undefined, path), event);
        expect(response?.headers.get('x-middleware-rewrite'), path).toBeNull();
        expect(response?.headers.get('location'), path).toBeNull();
        expect(response?.headers.get('cache-control'), path).toBe('private, no-store');
      }
      expect(maySeeContribute).not.toHaveBeenCalled();
      expect(withSession).not.toHaveBeenCalled();
    });

    it("lets a session the server cannot read through to the sign-in, as a visitor's", async () => {
      sessionRead.ok = false;
      const response = await proxy(request('authjs.session-token=t', PAGES[0]), event);
      expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
      expect(maySeeContribute).not.toHaveBeenCalled();
    });

    it('answers a signed-in account Contribute is hidden from with a 404 nobody caches; lets one it is open to on', async () => {
      const hidden = await proxy(request('authjs.session-token=t', PAGES[0]), event);
      expect(hidden?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/_404');
      expect(hidden?.headers.get('cache-control')).toBe('private, no-store');

      maySeeContribute.mockResolvedValue(true);
      const open = await proxy(request('authjs.session-token=t', PAGES[0]), event);
      expect(open?.headers.get('x-middleware-rewrite')).toBeNull();
      expect(open?.headers.get('cache-control')).toBe('private, no-cache');
    });

    it('keeps the 404 for a visitor on any other Contribute page and on the bare answer address', async () => {
      for (const path of ['/contribute/answer', '/contribute/answer/', '/contribute/settings']) {
        const response = await proxy(request(undefined, path), event);
        expect(response?.headers.get('x-middleware-rewrite'), path).toBe('https://gitranks.com/_404');
      }
    });
  });

  describe('the pages a link in our email opens', () => {
    const LINK_PAGES = [
      '/l/unfollow',
      '/follow/unfollow',
      '/following',
      '/following/',
      '/l/hero-preview',
      '/l/hero-opt-out',
      '/hero-link/preview',
      '/hero-link/opt-out',
    ];

    it.each(LINK_PAGES)('%s signed in: keeps private, no-store (not the signed-in no-cache)', async (path) => {
      const response = await proxy(request('authjs.session-token=t', path), event);
      expect(response?.headers.get('cache-control')).toBe('private, no-store');
    });

    it.each(LINK_PAGES)('%s signed out: leaves the page its own headers', async (path) => {
      const response = await proxy(request(undefined, path), event);
      expect(response?.headers.get('cache-control')).toBeNull();
      expect(withSession).not.toHaveBeenCalled();
    });

    it('any other signed-in page keeps private, no-cache', async () => {
      for (const path of ['/followers', '/following-x', '/lx', '/']) {
        const response = await proxy(request('authjs.session-token=t', path), event);
        expect(response?.headers.get('cache-control')).toBe('private, no-cache');
      }
    });
  });

  describe('the admin pages', () => {
    it.each(['/admin/unsung-hero', '/admin/unsung-hero/', '/admin', '/admin/anything'])(
      '%s without a session: a real 404 nobody caches, asking nothing about the visitor',
      async (path) => {
        const response = await proxy(request(undefined, path), event);
        expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/_404');
        expect(response?.headers.get('cache-control')).toBe('private, no-store');
        expect(withSession).not.toHaveBeenCalled();
      },
    );

    it('with only the session hint (signed out since): the same 404', async () => {
      const response = await proxy(request('has-session=1', '/admin/unsung-hero'), event);
      expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/_404');
    });

    it('a signed-in visitor goes on to the page, which asks the API', async () => {
      const response = await proxy(request('authjs.session-token=t', '/admin/unsung-hero'), event);
      expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
      expect(withSession).toHaveBeenCalled();
    });

    it('a path that only starts with "admin" is not touched', async () => {
      const response = await proxy(request(undefined, '/administrators'), event);
      expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
    });

    it.each(['/admin/unsung-hero', '/admin/unsung-hero/', '/admin'])(
      '%s signed in: private, no-store, so the browser keeps no copy',
      async (path) => {
        const response = await proxy(request('authjs.session-token=t', path), event);
        expect(response?.headers.get('cache-control')).toBe('private, no-store');
      },
    );

    it('a page whose name only starts with "admin" keeps private, no-cache', async () => {
      const response = await proxy(request('authjs.session-token=t', '/administrators'), event);
      expect(response?.headers.get('cache-control')).toBe('private, no-cache');
    });
  });

  describe('Learn', () => {
    const CLOSED = [
      '/learn',
      '/learn/',
      '/learn/profile',
      '/learn/lessons',
      '/learn/lessons/',
      '/learn/attempts',
      '/learn/attempts/A_1/more',
      '/learn/maintainers/x',
      '/learn/%E0%A4%A',
      '/learn/start/driftwood-js/driftwood/934',
      // The review and the check: signed in only.
      '/learn/review',
      '/learn/check/algorithms',
    ];

    it.each(CLOSED)('answers %s with a 404 nobody caches, to a visitor without a session', async (path) => {
      const response = await proxy(request(undefined, path), event);

      expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/_404');
      expect(response?.headers.get('cache-control')).toBe('private, no-store');
      expect(withSession).not.toHaveBeenCalled();
    });

    it('answers a signed-in viewer Learn is not open to with a 404 nobody caches, before any page renders', async () => {
      learnAccess.mockResolvedValue('closed');
      try {
        for (const path of [
          ...CLOSED.slice(0, 5),
          '/learn/attempts/A_1',
          '/learn/start/driftwood-js/driftwood/934',
          '/learn/review',
          '/learn/check/algorithms',
        ]) {
          const response = await proxy(request('authjs.session-token=t', path), event);
          expect(response?.headers.get('x-middleware-rewrite'), path).toBe('https://gitranks.com/_404');
          expect(response?.headers.get('cache-control'), path).toBe('private, no-store');
        }
        // The pages open to everyone are not asked about.
        learnAccess.mockClear();
        const lesson = await proxy(request('authjs.session-token=t', '/learn/lessons/route-cache-miss-8f3k'), event);
        expect(lesson?.headers.get('x-middleware-rewrite')).not.toBe('https://gitranks.com/_404');
        expect(learnAccess).not.toHaveBeenCalled();
      } finally {
        learnAccess.mockResolvedValue('open');
      }
    });

    it("asks nothing for a page's own actions (a POST): the API checks those itself", async () => {
      learnAccess.mockClear();
      learnAccess.mockResolvedValue('closed');
      try {
        const post = new NextRequest('https://gitranks.com/learn/attempts/A_1', {
          method: 'POST',
          headers: { cookie: 'authjs.session-token=t' },
        });
        const response = await proxy(post, event);
        expect(response?.headers.get('x-middleware-rewrite')).not.toBe('https://gitranks.com/_404');
        expect(learnAccess).not.toHaveBeenCalled();
      } finally {
        learnAccess.mockResolvedValue('open');
      }
    });

    it("treats a session the server cannot read as a visitor's (a lesson's old address redirects before this)", async () => {
      learnAccess.mockResolvedValue('signed-out');
      try {
        for (const path of ['/learn', '/learn/profile', '/learn/lessons', '/learn/attempts/A_1']) {
          const response = await proxy(request('authjs.session-token=t', path), event);
          expect(response?.headers.get('x-middleware-rewrite'), path).toBe('https://gitranks.com/_404');
        }
      } finally {
        learnAccess.mockResolvedValue('open');
      }
    });

    it('lets a signed-in viewer Learn is open to through to its pages', async () => {
      for (const path of [
        ...CLOSED.slice(0, 5),
        '/learn/attempts/A_1',
        '/Learn/Attempts/A_1',
        '/learn/start/driftwood-js/driftwood/934',
        '/learn/review',
        '/learn/check/algorithms',
      ]) {
        const response = await proxy(request('authjs.session-token=t', path), event);
        expect(response?.headers.get('x-middleware-rewrite'), path).toBeNull();
        expect(response?.headers.get('cache-control'), path).toBe('private, no-cache');
      }
      expect(maySeeContribute).not.toHaveBeenCalled();
    });

    it('lets everyone reach a shared lesson, its result pages and the page for maintainers', async () => {
      for (const path of [
        '/learn/maintainers',
        '/learn/maintainers/',
        '/learn/lessons/route-cache-miss-8f3k',
        '/learn/lessons/route-cache-miss-8f3k/',
        '/learn/lessons/route-cache-miss-8f3k/passes/octocat',
      ]) {
        const signedOut = await proxy(request(undefined, path), event);
        expect(signedOut?.headers.get('x-middleware-rewrite'), path).toBeNull();
        expect(signedOut?.headers.get('cache-control'), path).toBeNull();
      }
      expect(maySeeContribute).not.toHaveBeenCalled();
    });

    it('asks whether a shared lesson or a result is there before its page, which streams', async () => {
      await proxy(request(undefined, '/learn/lessons/route-cache-miss-8f3k/'), event);
      await proxy(request('authjs.session-token=t', '/learn/lessons/route-cache-miss-8f3k/passes/octocat'), event);
      expect(lessonGate.mock.calls).toEqual([
        [{ slug: 'route-cache-miss-8f3k' }],
        [{ slug: 'route-cache-miss-8f3k', login: 'octocat' }],
      ]);
    });

    it("answers a missing lesson or result with the lesson's 404 nobody caches, signed in or not, before Auth.js", async () => {
      lessonGate.mockResolvedValue({ kind: 'missing' });
      for (const cookie of [undefined, 'authjs.session-token=t']) {
        for (const path of ['/learn/lessons/gone-1a2b', '/learn/lessons/gone-1a2b/passes/octocat']) {
          const response = await proxy(request(cookie, path), event);
          expect(response?.headers.get('x-middleware-rewrite'), path).toBe(
            'https://gitranks.com/learn/lessons/_missing',
          );
          expect(response?.headers.get('cache-control'), path).toBe('private, no-store');
          expect(response?.headers.get('set-cookie'), path).toBeNull();
        }
      }
      expect(withSession).not.toHaveBeenCalled();
    });

    it("sends a renamed login to its current result page, with the page's query", async () => {
      lessonGate.mockResolvedValue({ kind: 'redirect', path: '/learn/lessons/route-cache-miss-8f3k/passes/octo-cat' });
      const response = await proxy(
        request(undefined, '/learn/lessons/route-cache-miss-8f3k/passes/octocat?react=yes'),
        event,
      );
      expect(response?.status).toBe(307);
      expect(response?.headers.get('location')).toBe(
        'https://gitranks.com/learn/lessons/route-cache-miss-8f3k/passes/octo-cat?react=yes',
      );
      expect(response?.headers.get('cache-control')).toBe('private, no-store');
    });

    it('answers a paused lesson of ours with its page and a 503, a removed one with a 410, kept by no shared cache', async () => {
      for (const status of [503, 410] as const) {
        lessonGate.mockResolvedValueOnce({ kind: 'gone', status, path: '/learn/lessons/_gone/sets' });
        const response = await proxy(request(undefined, '/learn/lessons/sets'), event);
        expect(response?.status).toBe(status);
        expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/learn/lessons/_gone/sets');
        expect(response?.headers.get('cache-control')).toBe('private, no-store');
        // A paused lesson says when to ask again; a removed one does not.
        expect(response?.headers.get('retry-after')).toBe(status === 503 ? '3600' : null);
      }
      expect(withSession).not.toHaveBeenCalled();
    });

    it('sends a moved lesson of ours to its new address for good, with the query', async () => {
      lessonGate.mockResolvedValue({ kind: 'redirect', path: '/learn/lessons/sets-in-one-pass', permanent: true });
      const response = await proxy(request(undefined, '/learn/lessons/sets?fact'), event);
      expect(response?.status).toBe(308);
      expect(response?.headers.get('location')).toBe('https://gitranks.com/learn/lessons/sets-in-one-pass?fact');
      expect(response?.headers.get('cache-control')).toBe('private, no-store');
    });

    it('answers a HEAD request for a missing lesson as a GET', async () => {
      lessonGate.mockResolvedValue({ kind: 'missing' });
      const head = new NextRequest('https://gitranks.com/learn/lessons/gone-1a2b', { method: 'HEAD' });
      const response = await proxy(head, event);
      expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/learn/lessons/_missing');
    });

    it("asks nothing for a lesson page's form posts, nor for paths that are not a lesson's page", async () => {
      const post = new NextRequest('https://gitranks.com/learn/lessons/route-cache-miss-8f3k', {
        method: 'POST',
        headers: { cookie: 'authjs.session-token=t' },
      });
      await proxy(post, event);
      for (const path of ['/learn/lessons', '/learn/lessons/', '/learn/maintainers', '/learn/lessons/x/passes']) {
        await proxy(request('authjs.session-token=t', path), event);
      }
      expect(lessonGate).not.toHaveBeenCalled();
    });

    it("answers a result page's .json from its route handler, signed in or not, before Auth.js", async () => {
      for (const cookie of [undefined, 'authjs.session-token=t']) {
        const response = await proxy(
          request(cookie, '/learn/lessons/route-cache-miss-8f3k/passes/Octo-cat.json'),
          event,
        );
        expect(response?.headers.get('x-middleware-rewrite')).toBe(
          'https://gitranks.com/api/learn/lessons/route-cache-miss-8f3k/passes/Octo-cat',
        );
        expect(response?.headers.get('set-cookie')).toBeNull();
      }
      expect(withSession).not.toHaveBeenCalled();
    });

    it('rewrites no other .json address, nor one whose slug or login is not shaped as ours', async () => {
      for (const path of [
        '/learn/lessons/route-cache-miss-8f3k.json',
        '/learn/lessons/route-cache-miss-8f3k/passes/octo.cat.json',
        '/learn/lessons/route%2Fcache/passes/octocat.json',
        '/learn/lessons/route-cache-miss-8f3k/passes/octocat.json/x',
        '/learn/lessons/route-cache-miss-8f3k/passes/octocat/x.json',
        '/learn/lessons/route-cache-miss-8f3k/passes/octocat.JSON',
      ]) {
        const response = await proxy(request(undefined, path), event);
        expect(response?.headers.get('x-middleware-rewrite') ?? '', path).not.toContain('/api/learn/');
      }
    });

    it('lets everyone reach all courses, a course, their copies and pictures, Learn closed to them or not', async () => {
      learnAccess.mockResolvedValue('closed');
      try {
        for (const cookie of [undefined, 'authjs.session-token=t']) {
          for (const path of [
            '/learn/courses',
            '/learn/courses/',
            '/learn/courses/algorithms',
            '/learn/courses/algorithms/',
            '/learn/courses/card.png',
            '/learn/courses/algorithms/card.png',
          ]) {
            const response = await proxy(request(cookie, path), event);
            expect(response?.headers.get('x-middleware-rewrite') ?? null, path).toBeNull();
          }
        }
      } finally {
        learnAccess.mockResolvedValue('open');
      }
    });

    it("asks a course's address before its page, and nothing for the list, its pictures or a form post", async () => {
      await proxy(request(undefined, '/learn/courses/algorithms/'), event);
      await proxy(request('authjs.session-token=t', '/learn/courses/Algorithms'), event);
      for (const path of ['/learn/courses', '/learn/courses/card.png', '/learn/courses/algorithms/card.png']) {
        await proxy(request(undefined, path), event);
      }
      // The page a gone course is sent to, with its two segments, is not a course's page.
      await proxy(request(undefined, '/learn/courses/_gone/algorithms'), event);
      await proxy(new NextRequest('https://gitranks.com/learn/courses/algorithms', { method: 'POST' }), event);
      expect(courseGate.mock.calls).toEqual([['algorithms'], ['Algorithms']]);
    });

    it('answers the pages of a gone or a missing course, reached directly, with the real 404', async () => {
      courseGate.mockResolvedValue({ kind: 'missing' });
      for (const path of ['/learn/courses/_gone', '/learn/courses/_missing']) {
        const response = await proxy(request(undefined, path), event);
        expect(response?.headers.get('x-middleware-rewrite'), path).toBe('https://gitranks.com/learn/courses/_missing');
      }
      expect(courseGate.mock.calls).toEqual([['_gone'], ['_missing']]);
    });

    it("answers a missing course with the course's 404 nobody caches, signed in or not, before Auth.js", async () => {
      courseGate.mockResolvedValue({ kind: 'missing' });
      for (const cookie of [undefined, 'authjs.session-token=t']) {
        const response = await proxy(request(cookie, '/learn/courses/gone-course'), event);
        expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/learn/courses/_missing');
        expect(response?.headers.get('cache-control')).toBe('private, no-store');
        expect(response?.headers.get('set-cookie')).toBeNull();
      }
      const head = await proxy(
        new NextRequest('https://gitranks.com/learn/courses/gone-course', { method: 'HEAD' }),
        event,
      );
      expect(head?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/learn/courses/_missing');
      expect(withSession).not.toHaveBeenCalled();
    });

    it('answers a paused course with its page and a 503, a removed one with a 410, kept by no shared cache', async () => {
      for (const status of [503, 410] as const) {
        courseGate.mockResolvedValueOnce({ kind: 'gone', status, path: '/learn/courses/_gone/algorithms' });
        const response = await proxy(request(undefined, '/learn/courses/algorithms'), event);
        expect(response?.status).toBe(status);
        expect(response?.headers.get('x-middleware-rewrite')).toBe(
          'https://gitranks.com/learn/courses/_gone/algorithms',
        );
        expect(response?.headers.get('cache-control')).toBe('private, no-store');
        expect(response?.headers.get('retry-after')).toBe(status === 503 ? '3600' : null);
      }
    });

    it('sends a moved course to its new address for good, with the query', async () => {
      courseGate.mockResolvedValue({ kind: 'redirect', path: '/learn/courses/algorithms-and-data' });
      const response = await proxy(request(undefined, '/learn/courses/algorithms?from=learn'), event);
      expect(response?.status).toBe(308);
      expect(response?.headers.get('location')).toBe(
        'https://gitranks.com/learn/courses/algorithms-and-data?from=learn',
      );
      expect(response?.headers.get('cache-control')).toBe('private, no-store');
    });

    it("answers a course's .md and that of all courses from their route handlers, before Auth.js and the gate", async () => {
      learnAccess.mockClear();
      for (const cookie of [undefined, 'authjs.session-token=t']) {
        const course = await proxy(request(cookie, '/learn/courses/algorithms.md'), event);
        expect(course?.headers.get('x-middleware-rewrite')).toBe(
          'https://gitranks.com/api/learn/courses/algorithms/course.md',
        );
        const all = await proxy(request(cookie, '/learn/courses.md'), event);
        expect(all?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/api/learn/courses/all.md');
      }
      expect(withSession).not.toHaveBeenCalled();
      expect(learnAccess).not.toHaveBeenCalled();
      expect(courseGate).not.toHaveBeenCalled();
      const odd = await proxy(request(undefined, '/learn/courses/Algorithms.md'), event);
      expect(odd?.headers.get('x-middleware-rewrite') ?? '').not.toContain('/api/learn/');
    });

    it("answers a lesson's .md from its route handler, for anyone, before Auth.js and before the lesson's gate", async () => {
      learnAccess.mockClear();
      lessonGate.mockClear();
      for (const cookie of [undefined, 'authjs.session-token=t']) {
        const response = await proxy(request(cookie, '/learn/lessons/route-cache-miss-8f3k.md'), event);
        expect(response?.headers.get('x-middleware-rewrite')).toBe(
          'https://gitranks.com/api/learn/lessons/route-cache-miss-8f3k/lesson.md',
        );
        expect(response?.headers.get('set-cookie')).toBeNull();
      }
      expect(withSession).not.toHaveBeenCalled();
      expect(learnAccess).not.toHaveBeenCalled();
      expect(lessonGate).not.toHaveBeenCalled();
    });

    it("lets anyone reach a lesson's pictures, Learn closed to them or not, without the lesson's gate", async () => {
      lessonGate.mockClear();
      learnAccess.mockResolvedValue('closed');
      try {
        for (const cookie of [undefined, 'authjs.session-token=t']) {
          for (const picture of ['card.png', 'fact.png']) {
            const path = `/learn/lessons/route-cache-miss-8f3k/${picture}`;
            const response = await proxy(request(cookie, path), event);
            expect(response?.headers.get('x-middleware-rewrite') ?? null, path).toBeNull();
          }
        }
        expect(lessonGate).not.toHaveBeenCalled();
      } finally {
        learnAccess.mockResolvedValue('open');
      }
    });

    it('rewrites no other .md address, nor one whose slug is not shaped as ours', async () => {
      for (const path of [
        '/learn/lessons/Route-Cache.md',
        '/learn/lessons/_gone.md',
        '/learn/lessons/a/b.md',
        '/learn/lessons/route-cache-miss-8f3k.md/x',
        '/learn/courses/Algorithms.md',
        '/learn/courses/_gone.md',
        '/learn/courses/a/b.md',
        '/learn/courses.md/x',
      ]) {
        const response = await proxy(request(undefined, path), event);
        expect(response?.headers.get('x-middleware-rewrite') ?? '', path).not.toContain('/api/learn/');
      }
    });

    it('leaves paths that only start alike alone', async () => {
      for (const path of ['/learning', '/learners/1']) {
        const response = await proxy(request(undefined, path), event);
        expect(response?.headers.get('x-middleware-rewrite'), path).toBeNull();
      }
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

    // A repository's page is its Overview tab; nothing here is the 404.
    expect(response?.headers.get('x-middleware-rewrite') ?? '').not.toContain('/_404');
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

  it("leaves the landing's rank card its own Cache-Control for a signed-in visitor", async () => {
    const response = await proxy(request('authjs.session-token=t', '/api/me/rank-card?login=octocat'), event);

    expect(withSession).toHaveBeenCalledTimes(1);
    expect(response?.headers.get('cache-control')).toBeNull();
    expect(response?.headers.getSetCookie()).toContain('has-session=1; Path=/; Max-Age=2592000; SameSite=Lax');
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

    it.each(['/badge/package/npm/react/used-by.svg', '/badge/package/npm/@types/node/downloads.png'])(
      'leaves the package badge %s to its route, which decides who sees it',
      (path) => {
        expect(matches(path)).toBe(false);
      },
    );

    it('leaves the AI Catalog alone', () => {
      expect(matches('/.well-known/ai-catalog.json')).toBe(false);
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

    it('leaves the media files alone', () => {
      expect(matches('/media/contribute-one-command-v1.mp4')).toBe(false);
      expect(matches('/media/contribute-one-command-v1.jpg')).toBe(false);
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
