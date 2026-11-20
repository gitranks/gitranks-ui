import { type NextFetchEvent, NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

// The proxy with Learn open to everyone (the API's answer), everything else as it is.
vi.mock('next-auth', () => ({ default: () => ({ auth: () => vi.fn(() => new Response(null)) }) }));
vi.mock('./lib/workspace/preview-gate', () => ({
  requestContributeAccess: async () => 'hidden',
  contributeOpen: async () => false,
}));
vi.mock('./lib/contribute/ledger-gate', () => ({ contributeLedgerOpen: async () => false }));
vi.mock('./lib/contribute/pr-timeline-gate', () => ({
  prTimelineGateOf: async () => ({ kind: 'page', partial: false, confirmed: true }),
}));
vi.mock('./lib/packages/packages-gate', () => ({
  packagesPublic: async () => false,
  requestMaySeePackages: async () => false,
}));
vi.mock('./lib/learn/lesson-gate', () => ({
  LESSON_MISSING_PATH: '/learn/lessons/_missing',
  lessonGateOf: async () => ({ kind: 'page' }),
}));
const progressGate = vi.hoisted(() => ({ value: 'page' as 'page' | 'missing', asked: [] as string[] }));
vi.mock('./lib/learn/public-progress/progress-gate', () => ({
  progressGateOf: async (login: string) => {
    progressGate.asked.push(login);
    return progressGate.value;
  },
}));
const everyone = vi.hoisted(() => ({ open: true }));
vi.mock('./lib/learn/learn-everyone', () => ({ learnOpenToEveryone: async () => everyone.open }));
// With Learn open to everyone, every signed-in viewer is one it is open to; a session the server cannot read is none.
const access = vi.hoisted(() => ({ value: 'open' as 'open' | 'signed-out' }));
vi.mock('./lib/workspace/gate', () => ({ requestLearnAccess: async () => access.value }));

const { default: proxy } = await import('./proxy');

const visit = (path: string) => proxy(new NextRequest(`https://gitranks.com${path}`), {} as NextFetchEvent);

describe('Learn open to visitors', () => {
  it('lets a visitor without a session through to the front door alone', async () => {
    for (const path of ['/learn', '/learn/', '/Learn']) {
      expect((await visit(path))?.headers.get('x-middleware-rewrite'), path).toBeNull();
    }
  });

  it("keeps Learn's other closed pages from visitors", async () => {
    for (const path of [
      '/learn/profile',
      '/learn/lessons',
      '/learn/attempts',
      '/learn/attempts/A_1/more',
      '/learn/about',
      '/learn/start/driftwood-js/driftwood/934',
      // Learn's flow opens to visitors in one later change, all three steps together.
      '/learn/start',
      '/learn/start/',
      '/learn/start/issues',
      '/learn/start/issues?language=Go&level=1',
      '/learn/x',
    ]) {
      expect((await visit(path))?.headers.get('x-middleware-rewrite'), path).toBe('https://gitranks.com/_404');
    }
  });

  it('never lets a shared cache keep a signed-in /learn: Learn home is drawn for each viewer', async () => {
    for (const path of ['/learn', '/learn/', '/learn/about']) {
      const request = new NextRequest(`https://gitranks.com${path}`, {
        headers: { cookie: 'authjs.session-token=t' },
      });
      const cache = (await proxy(request, {} as NextFetchEvent))?.headers.get('cache-control');
      expect(cache, path).toBe('private, no-cache');
      expect(cache, path).not.toContain('s-maxage');
    }
  });

  it('keeps the front door from visitors while Learn is not open to everyone', async () => {
    everyone.open = false;
    try {
      for (const path of ['/learn', '/learn/']) {
        expect((await visit(path))?.headers.get('x-middleware-rewrite'), path).toBe('https://gitranks.com/_404');
      }
    } finally {
      everyone.open = true;
    }
  });

  it('lets a session the server cannot read through to the front door, as a visitor', async () => {
    access.value = 'signed-out';
    try {
      const request = new NextRequest('https://gitranks.com/learn', { headers: { cookie: 'authjs.session-token=t' } });
      expect((await proxy(request, {} as NextFetchEvent))?.headers.get('x-middleware-rewrite')).toBeNull();
      const profile = new NextRequest('https://gitranks.com/learn/profile', {
        headers: { cookie: 'authjs.session-token=t' },
      });
      expect((await proxy(profile, {} as NextFetchEvent))?.headers.get('x-middleware-rewrite')).toBe(
        'https://gitranks.com/_404',
      );
    } finally {
      access.value = 'open';
    }
  });

  it('lets everyone through to a public progress page with a record, while Learn is not open to everyone too', async () => {
    everyone.open = false;
    progressGate.asked.length = 0;
    try {
      const response = await visit('/learn/progress/octocat');
      expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
      expect(progressGate.asked).toEqual(['octocat']);
    } finally {
      everyone.open = true;
    }
  });

  it('answers a public progress page with no record, or another spelling of the login, with a 404 nobody keeps', async () => {
    progressGate.value = 'missing';
    try {
      const response = await visit('/learn/progress/OctoCat');
      expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/_404');
      expect(response?.headers.get('Cache-Control')).toBe('private, no-store');
    } finally {
      progressGate.value = 'page';
    }
  });
});
