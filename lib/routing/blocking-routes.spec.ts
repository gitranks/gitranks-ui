import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
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
  { segment: 'repo/[owner]/[name]', module: () => import('@/app/repo/[owner]/[name]/page'), params: ['owner', 'name'] },
  { segment: 'profile/[login]', module: () => import('@/app/profile/[login]/layout'), params: ['login'] },
  { segment: 'org/[login]', module: () => import('@/app/org/[login]/layout'), params: ['login'] },
  { segment: 'insights/[id]', module: () => import('@/app/insights/[id]/page'), params: ['id'] },
  {
    segment: 'repos/language/[language]/[page]',
    module: () => import('@/app/repos/language/[language]/[page]/layout'),
    params: ['language', 'page'],
  },
  {
    segment: 'repos/no-language/[page]',
    module: () => import('@/app/repos/no-language/[page]/layout'),
    params: ['page'],
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

  it('lists a language with ranked repositories, not the no-language list', async () => {
    const { generateStaticParams } = await import('@/app/repos/language/[language]/[page]/layout');
    await expect(generateStaticParams()).resolves.toEqual([{ language: 'Rust', page: '1' }]);
  });
});
