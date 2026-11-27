import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import {
  BLOCKING_ROUTES,
  blockingRouteProblems,
  STATIC_404_PAGES,
  static404Problems,
} from '@/scripts/check-blocking-routes.mjs';

vi.mock('server-only', () => ({}));
// A page's client parts may import a server action that reads the session: none is read when the module loads.
vi.mock('@/auth', () => ({ auth: async () => null }));
vi.mock('@/graphql/helpers/fetch-repo-languages', () => ({
  fetchRepoLanguages: async () => [{ language: null }, { language: 'Rust' }],
}));

const APP = join(dirname(fileURLToPath(import.meta.url)), '../../app');

/**
 * Pages that call `notFound()` or `permanentRedirect()` for params no build can know. Next decides a response's
 * status before the page runs when it serves a prerendered fallback shell, so such a 404 or 308 would reach the
 * browser as a 200 carrying the not-found page or a client-side redirect. A route that lists params in
 * `generateStaticParams` (with `instant = false`, params awaited outside any Suspense boundary) has no fallback shell:
 * an unlisted param renders as a whole page first and its status is real. A `loading.tsx` on the way would add a
 * boundary and bring the 200 back.
 */
const ROUTES = [
  { segment: 'profile/[login]', module: () => import('@/app/profile/[login]/layout'), params: ['login'] },
  // A person's Skills tab: the profile's layout lists the login.
  { segment: 'profile/[login]/skills', module: () => import('@/app/profile/[login]/layout'), params: ['login'] },
  { segment: 'org/[login]', module: () => import('@/app/org/[login]/layout'), params: ['login'] },
  { segment: 'insights/[id]', module: () => import('@/app/insights/[id]/page'), params: ['id'] },
  {
    segment: 'contribute/pr/[owner]/[repo]/[number]',
    module: () => import('@/app/(pr-timeline)/contribute/pr/[owner]/[repo]/[number]/page'),
    params: ['owner', 'repo', 'number'],
  },
  {
    segment: 'repos/language/[language]/[page]',
    module: () => import('@/app/repos/language/[language]/[page]/layout'),
    params: ['language', 'page'],
  },
  // A repository's tabs: their layout lists the params (the Overview is reached at the repository's own address, by
  // the proxy).
  ...(['overview', 'used-by', 'contributors'] as const).map((tab) => ({
    segment: `repo/[owner]/[name]/${tab}`,
    module: () => import('@/app/repo/[owner]/[name]/(tabs)/layout'),
    params: ['owner', 'name'],
  })),
  {
    segment: 'repos/no-language/[page]',
    module: () => import('@/app/repos/no-language/[page]/layout'),
    params: ['page'],
  },
  {
    segment: 'package/[registry]/[...name]',
    module: () => import('@/app/package/[registry]/[...name]/page'),
    params: ['registry', 'name'],
  },
  // A Build project, in Build's route group.
  { segment: 'build/[project]', module: () => import('@/app/(build)/build/[project]/page'), params: ['project'] },
  {
    segment: 'packages/[registry]/[by]/[page]',
    module: () => import('@/app/packages/[registry]/[by]/[page]/layout'),
    params: ['registry', 'by', 'page'],
  },
];

describe('routes whose missing pages answer 404', () => {
  it.each(ROUTES)('$segment lists params, so an unlisted one renders before the response', async (route) => {
    const { generateStaticParams, instant } = (await route.module()) as {
      generateStaticParams?: () => Promise<Record<string, string>[]>;
      instant?: unknown;
    };

    expect(instant).toBe(false);
    const listed = await generateStaticParams?.();
    expect(listed?.length).toBeGreaterThan(0);
    for (const params of listed ?? []) {
      expect(Object.keys(params).sort()).toEqual([...route.params].sort());
      for (const value of Object.values(params)) expect(value).toBeTruthy();
    }
  });

  it.each(ROUTES)('$segment has no loading.tsx on its way', ({ segment }) => {
    const parts = segment.split('/');
    for (let depth = 0; depth <= parts.length; depth++) {
      expect(existsSync(join(APP, ...parts.slice(0, depth), 'loading.tsx'))).toBe(false);
    }
  });

  it("has no loading.tsx in the repository tabs' route group", () => {
    for (const tab of ['', 'overview', 'used-by', 'contributors']) {
      expect(existsSync(join(APP, 'repo/[owner]/[name]/(tabs)', tab, 'loading.tsx'))).toBe(false);
    }
  });

  it("has no loading.tsx in Build's route group, on the way to a project", () => {
    for (const dir of ['', 'build', 'build/[project]']) {
      expect(existsSync(join(APP, '(build)', dir, 'loading.tsx'))).toBe(false);
    }
  });

  it('lists a language with ranked repositories, not the no-language list', async () => {
    const { generateStaticParams } = await import('@/app/repos/language/[language]/[page]/layout');
    await expect(generateStaticParams()).resolves.toEqual([{ language: 'Rust', page: '1' }]);
  });
});

describe('the post-build check', () => {
  const manifest = (fallback: unknown) => ({
    dynamicRoutes: Object.fromEntries(BLOCKING_ROUTES.map((route) => [route, { fallback }])),
  });

  it('covers the same routes as this spec', () => {
    expect([...BLOCKING_ROUTES].sort()).toEqual(ROUTES.map(({ segment }) => `/${segment}`).sort());
  });

  it('passes when no route has a fallback shell', () => {
    expect(blockingRouteProblems(manifest(null))).toEqual([]);
  });

  it('fails on a fallback shell or a missing route', () => {
    expect(blockingRouteProblems(manifest('/repo/[owner]/[name]/overview'))).toHaveLength(BLOCKING_ROUTES.length);
    const { dynamicRoutes } = manifest(null);
    delete (dynamicRoutes as Record<string, unknown>)['/org/[login]'];
    expect(blockingRouteProblems({ dynamicRoutes })).toEqual(['/org/[login]: not in the prerender manifest']);
  });

  it('checks that the static 404 pages are prerendered with a 404 status', () => {
    expect(static404Problems(() => ({ status: 404 }))).toEqual([]);
    expect(static404Problems(() => ({ status: 200 }))).toEqual([
      '/learn/lessons/_missing: prerendered with status 200, not 404',
      '/learn/courses/_missing: prerendered with status 200, not 404',
    ]);
    expect(static404Problems(() => ({}))).toEqual([
      '/learn/lessons/_missing: prerendered with status undefined, not 404',
      '/learn/courses/_missing: prerendered with status undefined, not 404',
    ]);
    expect(static404Problems(() => null)).toEqual([
      '/learn/lessons/_missing: not prerendered',
      '/learn/courses/_missing: not prerendered',
    ]);
  });

  it("lists the proxy's lesson and course 404 pages", async () => {
    const { LESSON_MISSING_PATH } = await import('@/lib/learn/lesson-gate');
    const { LEARN_COURSE_MISSING_PATH } = await import('@/lib/learn/paths');
    expect(STATIC_404_PAGES).toContain(LESSON_MISSING_PATH);
    expect(STATIC_404_PAGES).toContain(LEARN_COURSE_MISSING_PATH);
  });
});
