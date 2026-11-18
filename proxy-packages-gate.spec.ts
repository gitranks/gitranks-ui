import { type NextFetchEvent, NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The proxy with the packages gate itself, over an API that answers late or not at all: a repository page, today's
// busiest, never waits on it once an answer is kept.

const withSession = vi.fn(() => new Response(null));
vi.mock('next-auth', () => ({ default: () => ({ auth: () => withSession }) }));
vi.mock('server-only', () => ({}));
vi.mock('./lib/contribute/preview-gate', () => ({
  requestContributeAccess: async () => 'hidden',
  contributeOpen: async () => false,
}));
vi.mock('./lib/contribute/ledger-gate', () => ({ contributeLedgerOpen: async () => false }));
vi.mock('./lib/learn/lesson-gate', () => ({
  LESSON_MISSING_PATH: '/learn/lessons/_missing',
  lessonGateOf: async () => ({ kind: 'page' }),
}));
const { graphqlDirect, sessionTokenOf } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), sessionTokenOf: vi.fn() }));
vi.mock('./lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('./lib/contribute/session-token', () => ({ sessionTokenOf }));

const { default: proxy } = await import('./proxy');
const { ASK_TIMEOUT_MS, resetPackagesGate } = await import('./lib/packages/packages-gate');

const event = {} as NextFetchEvent;
const repoPage = (cookie?: string) =>
  new NextRequest('https://gitranks.com/repo/facebook/react', cookie ? { headers: { cookie } } : undefined);
const closed = { packagesGate: { everyone: false, viewer: false } };
const hung = () => new Promise(() => {});
/** Whatever is done by the time pending callbacks run: a request that waits on the API is not. */
const settle = () => new Promise((resolve) => setImmediate(() => resolve('waited')));

describe('a repository page and the packages gate', () => {
  beforeEach(() => {
    resetPackagesGate();
    graphqlDirect.mockReset();
    sessionTokenOf.mockReset();
    withSession.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is asked once, then answered from memory', async () => {
    graphqlDirect.mockResolvedValue(closed);

    for (let i = 0; i < 3; i++) {
      const response = await proxy(repoPage(), event);
      expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
    }
    expect(graphqlDirect).toHaveBeenCalledOnce();
  });

  it('does not wait for a hung gate once an answer is kept: the hidden visitor gets today’s page at once', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(0);
    graphqlDirect.mockResolvedValueOnce(closed).mockImplementation(hung);
    await proxy(repoPage(), event);

    // Past the minute: the answer is old, and asking again hangs.
    now.mockReturnValue(120_000);
    for (const cookie of [undefined, 'authjs.session-token=t']) {
      sessionTokenOf.mockResolvedValue(null);
      const response = await Promise.race([proxy(repoPage(cookie), event), settle()]);
      expect(response).not.toBe('waited');
      expect((response as Response).headers.get('x-middleware-rewrite')).toBeNull();
    }
    now.mockRestore();
  });

  it('waits at most the timeout for a first answer, then serves today’s page', async () => {
    vi.useFakeTimers();
    graphqlDirect.mockImplementation(hung);

    const pending = proxy(repoPage(), event);
    await vi.advanceTimersByTimeAsync(ASK_TIMEOUT_MS);
    const response = await pending;
    expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
  });
});

describe("a package page's %40 spelling", () => {
  beforeEach(() => {
    resetPackagesGate();
    graphqlDirect.mockReset();
    sessionTokenOf.mockReset();
  });

  it('redirects to the @ spelling with a 308, before the gate is asked', async () => {
    for (const path of ['/package/npm/%40nebula/ui', '/package/npm/%40Nebula/ui']) {
      const response = await proxy(new NextRequest(`https://gitranks.com${path}?x=1`), event);
      expect(response?.status, path).toBe(308);
      expect(response?.headers.get('location')).toBe(`https://gitranks.com${path.replace(/%40/i, '@')}?x=1`);
    }
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('leaves the @ spelling, other paths and a %40 past the scope alone', async () => {
    const { packageScopeRedirectOf } = await import('./proxy');
    expect(packageScopeRedirectOf('/package/npm/@nebula/ui')).toBeNull();
    expect(packageScopeRedirectOf('/package/npm/left-pad')).toBeNull();
    expect(packageScopeRedirectOf('/packages/npm/%40x/1')).toBeNull();
    expect(packageScopeRedirectOf('/package/npm/nebula%40ui')).toBeNull();
    expect(packageScopeRedirectOf('/package/npm/%40nebula/ui')).toBe('/package/npm/@nebula/ui');
  });
});
