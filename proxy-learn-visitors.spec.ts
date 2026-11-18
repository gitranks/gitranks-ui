import { type NextFetchEvent, NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

// The proxy with Learn open to everyone (the API's answer), everything else as it is.
vi.mock('next-auth', () => ({ default: () => ({ auth: () => vi.fn(() => new Response(null)) }) }));
vi.mock('./lib/contribute/preview-gate', () => ({
  requestContributeAccess: async () => 'hidden',
  contributeOpen: async () => false,
}));
vi.mock('./lib/contribute/ledger-gate', () => ({ contributeLedgerOpen: async () => false }));
vi.mock('./lib/contribute/pr-timeline-gate', () => ({
  contributePrTimelineOpen: async () => false,
  prTimelineGateOf: async () => ({ kind: 'page', partial: false }),
}));
vi.mock('./lib/packages/packages-gate', () => ({
  packagesPublic: async () => false,
  requestMaySeePackages: async () => false,
}));
vi.mock('./lib/learn/lesson-gate', () => ({
  LESSON_MISSING_PATH: '/learn/lessons/_missing',
  lessonGateOf: async () => ({ kind: 'page' }),
}));
const everyone = vi.hoisted(() => ({ open: true }));
vi.mock('./lib/learn/learn-everyone', () => ({ learnOpenToEveryone: async () => everyone.open }));

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
      '/learn/x',
    ]) {
      expect((await visit(path))?.headers.get('x-middleware-rewrite'), path).toBe('https://gitranks.com/_404');
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
});
