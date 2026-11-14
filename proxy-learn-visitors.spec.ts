import { type NextFetchEvent, NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

// The proxy with Learn's front door open to visitors: the switch on, everything else as it is.
vi.mock('next-auth', () => ({ default: () => ({ auth: () => vi.fn(() => new Response(null)) }) }));
vi.mock('./lib/contribute/preview-gate', () => ({
  requestMaySeeContribute: async () => false,
  contributeOpen: async () => false,
}));
vi.mock('./lib/contribute/ledger-gate', () => ({ contributeLedgerOpen: async () => false }));
vi.mock('./lib/learn/learn-path', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./lib/learn/learn-path')>()),
  LEARN_OPEN_TO_VISITORS: true,
}));

const { default: proxy } = await import('./proxy');

const visit = (path: string) => proxy(new NextRequest(`https://gitranks.com${path}`), {} as NextFetchEvent);

describe('Learn open to visitors', () => {
  it('lets a visitor without a session through to the front door alone', async () => {
    for (const path of ['/learn', '/learn/', '/Learn']) {
      expect((await visit(path))?.headers.get('x-middleware-rewrite'), path).toBeNull();
    }
  });

  it("keeps Learn's other closed pages from visitors", async () => {
    for (const path of ['/learn/profile', '/learn/lessons', '/learn/attempts/A_1', '/learn/x']) {
      expect((await visit(path))?.headers.get('x-middleware-rewrite'), path).toBe('https://gitranks.com/_404');
    }
  });
});
