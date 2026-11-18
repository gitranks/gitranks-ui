import { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  dependentRows,
  notReadPackage,
  quietPackage,
  rankedPackage,
} from '@/app/package/[registry]/[...name]/__fixtures__/package';

const {
  packagesPublic,
  requestMaySeePackages,
  fetchPackage,
  fetchPackageDependents,
  signedFetch,
  revalidateTag,
  current,
} = vi.hoisted(() => ({
  packagesPublic: vi.fn(async () => false),
  requestMaySeePackages: vi.fn(async (_req: unknown) => false),
  fetchPackage: vi.fn(),
  fetchPackageDependents: vi.fn(),
  signedFetch: vi.fn(),
  revalidateTag: vi.fn(),
  current: { session: null as Session | null },
}));

type Handler = (req: NextRequest & { auth: Session | null }, context: unknown) => unknown;

vi.mock('server-only', () => ({}));
vi.mock('@/lib/packages/packages-gate', () => ({ packagesPublic, requestMaySeePackages }));
vi.mock('@/graphql/helpers/fetch-package', () => ({
  PACKAGE_UNAVAILABLE: 'unavailable',
  fetchPackage,
  fetchPackageDependents,
}));
vi.mock('@/lib/signed-fetch', () => ({ signedFetch }));
vi.mock('next/cache', () => ({ revalidateTag }));
vi.mock('@/auth', () => ({
  auth: (handler: Handler) => (req: NextRequest & { auth: Session | null }, context: unknown) => {
    req.auth = current.session;
    return handler(req, context);
  },
}));

const route = (await import('./route')) as unknown as {
  GET: (req: NextRequest, context: { params: Promise<{ registry: string; rest: string[] }> }) => Promise<Response>;
  POST: (req: NextRequest, context: { params: Promise<{ registry: string; rest: string[] }> }) => Promise<Response>;
};

const { resetPackageRefreshState } = await import('./refresh-status');

const call = (method: 'GET' | 'POST', path: string, search = '') => {
  const [registry, ...rest] = path.split('/');
  return route[method](new NextRequest(`https://gitranks.com/api/packages/${path}${search}`, { method }), {
    params: Promise.resolve({ registry, rest }),
  });
};

const PRIVATE = 'private, no-store';
const PAGE = { total: 16, archived: 1, items: dependentRows };
const upstream = (status: number, body: unknown) =>
  signedFetch.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));

describe('package routes', () => {
  beforeEach(() => {
    packagesPublic.mockReset().mockResolvedValue(false);
    requestMaySeePackages.mockReset().mockResolvedValue(false);
    fetchPackage.mockReset().mockResolvedValue(rankedPackage);
    fetchPackageDependents.mockReset().mockResolvedValue(PAGE);
    signedFetch.mockReset();
    revalidateTag.mockReset();
    current.session = null;
    resetPackageRefreshState();
    vi.useRealTimers();
  });

  it('answers the not-found answer, kept by no cache, to a visitor who may not see package pages', async () => {
    for (const [method, path] of [
      ['GET', 'npm/react/dependents'],
      ['GET', 'npm/react/refresh'],
      ['GET', 'npm/react/facts.md'],
      ['POST', 'npm/react/refresh'],
    ] as const) {
      const response = await call(method, path);
      expect(response.status, `${method} ${path}`).toBe(404);
      expect(response.headers.get('Cache-Control')).toBe(PRIVATE);
    }
    expect(fetchPackageDependents).not.toHaveBeenCalled();
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it('answers a page of dependents, kept by no shared cache while packages are not public', async () => {
    requestMaySeePackages.mockResolvedValue(true);

    const response = await call('GET', 'npm/@nebula/ui/dependents', '?offset=25&archived=0');

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(PRIVATE);
    expect(await response.json()).toEqual({ page: PAGE });
    expect(fetchPackageDependents).toHaveBeenCalledExactlyOnceWith('@nebula/ui', { offset: 25, hideArchived: true });
  });

  it('lets a shared cache keep a page once packages are public, and says when package data is unavailable', async () => {
    packagesPublic.mockResolvedValue(true);
    requestMaySeePackages.mockResolvedValue(true);

    const response = await call('GET', 'npm/react/dependents');
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    );

    fetchPackageDependents.mockResolvedValue('unavailable');
    const unavailable = await call('GET', 'npm/react/dependents');
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get('Cache-Control')).toBe(PRIVATE);

    fetchPackageDependents.mockResolvedValue(null);
    expect((await call('GET', 'npm/react/dependents')).status).toBe(404);
  });

  it('refuses a path or a query that names nothing', async () => {
    requestMaySeePackages.mockResolvedValue(true);

    // Params arrive decoded: `%40` is taken as it is, never as a second spelling of `@`.
    for (const path of [
      'pypi/react/dependents',
      'npm/react',
      'npm/react/badge',
      'npm/nebula/ui/dependents',
      'npm/%40nebula/ui/dependents',
    ]) {
      expect((await call('GET', path)).status, path).toBe(404);
    }
    for (const search of ['?offset=7', '?offset=99999', '?archived=1']) {
      expect((await call('GET', 'npm/react/dependents', search)).status, search).toBe(400);
    }
    expect(fetchPackageDependents).not.toHaveBeenCalled();
  });

  it("reads the refresh's status as the site, one call per package a few seconds, and expires the page once per update", async () => {
    vi.useFakeTimers({ toFake: ['Date'], now: Date.parse('2026-11-17T12:00:00Z') });
    requestMaySeePackages.mockResolvedValue(true);
    const landed = new Date(Date.now() - 60_000).toISOString();
    upstream(200, { running: false, lastUpdatedAt: landed, dependentsChecked: false });

    const [first, second] = await Promise.all([
      call('GET', 'npm/@nebula/ui/refresh'),
      call('GET', 'npm/@nebula/ui/refresh'),
    ]);

    expect(await first.json()).toEqual({ running: false, lastUpdatedAt: landed, dependentsChecked: false });
    expect(await second.json()).toEqual({ running: false, lastUpdatedAt: landed, dependentsChecked: false });
    expect(signedFetch).toHaveBeenCalledExactlyOnceWith('/packages/refresh/status?registry=npm&name=%40nebula%2Fui', {
      cache: 'no-store',
    });
    expect(revalidateTag).toHaveBeenCalledExactlyOnceWith('package:npm/@nebula/ui', { expire: 0 });

    // A few seconds on the API is asked again; the same update expires nothing more, a new one does.
    vi.setSystemTime(Date.now() + 6_000);
    upstream(200, { running: false, lastUpdatedAt: landed, dependentsChecked: true });
    await call('GET', 'npm/@nebula/ui/refresh');
    expect(signedFetch).toHaveBeenCalledTimes(2);
    expect(revalidateTag).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + 6_000);
    upstream(200, {
      running: false,
      lastUpdatedAt: new Date(Date.now() - 1_000).toISOString(),
      dependentsChecked: true,
    });
    await call('GET', 'npm/@nebula/ui/refresh');
    expect(revalidateTag).toHaveBeenCalledTimes(2);
  });

  it('asks for "Refresh now" signed as the visitor, with their email, and expires the page once one starts', async () => {
    requestMaySeePackages.mockResolvedValue(true);
    expect((await call('POST', 'npm/react/refresh')).status).toBe(401);

    current.session = {
      user: { githubLogin: 'octo-dev', email: 'octo@example.com' },
      expires: '2099-01-01T00:00:00.000Z',
    } as Session;
    upstream(200, { status: 'started', nextAt: '2026-11-19T10:00:00.000Z' });

    const response = await call('POST', 'npm/react/refresh');

    expect(await response.json()).toEqual({ status: 'started', nextAt: '2026-11-19T10:00:00.000Z' });
    const [path, init, source, login, email] = signedFetch.mock.lastCall ?? [];
    expect([path, source, login, email]).toEqual(['/packages/refresh', 'client', 'octo-dev', 'octo@example.com']);
    expect(JSON.parse(String(init.body))).toEqual({ registry: 'npm', name: 'react' });
    expect(revalidateTag).toHaveBeenCalledExactlyOnceWith('package:npm/react', { expire: 0 });

    upstream(200, { status: 'used', nextAt: '2026-11-19T10:00:00.000Z' });
    await call('POST', 'npm/react/refresh');
    expect(revalidateTag).toHaveBeenCalledTimes(1);

    upstream(410, { message: 'gone' });
    expect((await call('POST', 'npm/react/refresh')).status).toBe(410);
  });

  describe('facts.md', () => {
    it("answers a package's facts in markdown, never indexed, private until package pages are open to everyone", async () => {
      requestMaySeePackages.mockResolvedValue(true);
      const response = await call('GET', 'npm/react-resize-detector/facts.md');

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8');
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
      expect(response.headers.get('Cache-Control')).toBe(PRIVATE);
      expect(await response.text()).toMatch(/^# react-resize-detector \(npm package\)\n/);
      expect(fetchPackage).toHaveBeenCalledWith('react-resize-detector');
    });

    it('may be kept by a shared cache once package pages are open to everyone, but not while a refresh runs', async () => {
      packagesPublic.mockResolvedValue(true);
      requestMaySeePackages.mockResolvedValue(true);
      expect((await call('GET', 'npm/react-resize-detector/facts.md')).headers.get('Cache-Control')).toBe(
        'public, max-age=300, s-maxage=3600',
      );

      fetchPackage.mockResolvedValue({ ...rankedPackage, refreshRunning: true });
      expect((await call('GET', 'npm/react-resize-detector/facts.md')).headers.get('Cache-Control')).toBe(PRIVATE);
    });

    it('reads a scoped name', async () => {
      requestMaySeePackages.mockResolvedValue(true);
      fetchPackage.mockResolvedValue(quietPackage);

      expect((await call('GET', 'npm/@nebula/ui/facts.md')).status).toBe(200);
      expect(fetchPackage).toHaveBeenCalledWith('@nebula/ui');
    });

    it('answers 404 for a name nobody has read or the registry does not have, and 503 without package data', async () => {
      requestMaySeePackages.mockResolvedValue(true);
      fetchPackage
        .mockResolvedValueOnce(notReadPackage)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('unavailable');

      expect((await call('GET', 'npm/left-pad-next/facts.md')).status).toBe(404);
      expect((await call('GET', 'npm/nope/facts.md')).status).toBe(404);
      const unavailable = await call('GET', 'npm/react/facts.md');
      expect(unavailable.status).toBe(503);
      expect(unavailable.headers.get('Cache-Control')).toBe(PRIVATE);
    });

    it("sends the registry's own spelling to its address", async () => {
      requestMaySeePackages.mockResolvedValue(true);
      const response = await call('GET', 'npm/React-Resize-Detector/facts.md');

      expect(response.status).toBe(308);
      expect(response.headers.get('Location')).toBe('https://gitranks.com/package/npm/react-resize-detector/facts.md');
    });
  });
});
