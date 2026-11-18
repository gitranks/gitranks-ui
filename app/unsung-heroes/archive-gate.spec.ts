import { type NextFetchEvent, NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The archive behind the proxy, as the package pages are: a real 404 nobody caches for whoever the feature is hidden
// from, the page for whoever it is open to. The maintainer's link pages are never behind it. The gate is the real one,
// over an API mocked here; each test starts with a fresh one, so no kept answer carries over.

const withSession = vi.fn(() => new Response(null));
vi.mock('next-auth', () => ({ default: () => ({ auth: () => withSession }) }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/contribute/preview-gate', () => ({
  requestContributeAccess: async () => 'hidden',
  contributeOpen: async () => false,
}));
vi.mock('@/lib/contribute/ledger-gate', () => ({ contributeLedgerOpen: async () => false }));
// Learn is not open to everyone: a visitor's /learn stays a 404.
vi.mock('@/lib/learn/learn-everyone', () => ({ learnOpenToEveryone: async () => false }));
vi.mock('@/lib/learn/lesson-gate', () => ({
  LESSON_MISSING_PATH: '/learn/lessons/_missing',
  lessonGateOf: async () => ({ kind: 'page' }),
}));
const { graphqlDirect, sessionTokenOf } = vi.hoisted(() => ({ graphqlDirect: vi.fn(), sessionTokenOf: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect }));
vi.mock('@/lib/contribute/session-token', () => ({ sessionTokenOf }));

const event = {} as NextFetchEvent;
const SIGNED_IN = 'authjs.session-token=t';
const request = (path: string, cookie?: string) =>
  new NextRequest(`https://gitranks.com${path}`, cookie ? { headers: { cookie } } : undefined);

/** The API's answer about the feature: open to everyone, to this viewer, or to neither. */
const gate = (everyone: boolean, viewer = false) =>
  graphqlDirect.mockResolvedValue({ packagesGate: { everyone, viewer } });

async function freshProxy() {
  vi.resetModules();
  return (await import('@/proxy')).default;
}

const ARCHIVE_PATHS = [
  '/unsung-heroes',
  '/unsung-heroes/',
  '/unsung-heroes/card.png',
  '/unsung-heroes/card.png?week=2026-11-16',
  '/Unsung-Heroes',
  '/%75nsung-heroes',
];

beforeEach(() => {
  graphqlDirect.mockReset();
  sessionTokenOf.mockReset();
  withSession.mockClear();
});

describe('/unsung-heroes and its preview image, until the feature is public', () => {
  it.each(ARCHIVE_PATHS)('%s: a 404 nobody caches for a visitor without a session', async (path) => {
    gate(false);
    const response = await (await freshProxy())(request(path), event);
    expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/_404');
    expect(response?.headers.get('cache-control')).toBe('private, no-store');
  });

  it.each(ARCHIVE_PATHS)('%s: a 404 for a signed-in visitor the API says no to', async (path) => {
    gate(false, false);
    sessionTokenOf.mockResolvedValue({ githubLogin: 'someone' });
    const response = await (await freshProxy())(request(path, SIGNED_IN), event);
    expect(response?.headers.get('x-middleware-rewrite')).toBe('https://gitranks.com/_404');
    expect(response?.headers.get('cache-control')).toBe('private, no-store');
  });

  it.each(ARCHIVE_PATHS)('%s: the page for a signed-in visitor the API lets in', async (path) => {
    gate(false, true);
    sessionTokenOf.mockResolvedValue({ githubLogin: 'listed' });
    const response = await (await freshProxy())(request(path, SIGNED_IN), event);
    expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
    expect(response?.headers.get('cache-control')).toBe('private, no-cache');
  });
});

describe('/unsung-heroes once public', () => {
  it.each(ARCHIVE_PATHS)('%s: the page for everyone, signed out too', async (path) => {
    gate(true);
    const response = await (await freshProxy())(request(path), event);
    expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
  });
});

describe("the maintainer's link pages", () => {
  const LINK_PATHS = ['/l/hero-preview', '/l/hero-opt-out', '/hero-link/preview', '/hero-link/opt-out'];

  it.each(LINK_PATHS)('%s: never behind the gate, whatever it says', async (path) => {
    gate(false);
    const response = await (await freshProxy())(request(path), event);
    expect(response?.headers.get('x-middleware-rewrite')).toBeNull();
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it.each(LINK_PATHS)('%s signed in: private, no-store (not the signed-in no-cache)', async (path) => {
    gate(false);
    const response = await (await freshProxy())(request(path, SIGNED_IN), event);
    expect(response?.headers.get('cache-control')).toBe('private, no-store');
  });
});
