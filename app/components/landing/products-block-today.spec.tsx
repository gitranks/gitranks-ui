import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { homeLearnCourses } from './__fixtures__/products-block';

const session = vi.hoisted(() => ({
  current: { data: null, status: 'unauthenticated' } as { data: unknown; status: string },
}));
vi.mock('next-auth/react', () => ({ useSession: () => session.current }));

const { ProductsBlockLive } = await import('./products-block-live');
const { BUILD_OPEN_TO_EVERYONE } = await import('@/lib/build/built-parts');

/*
 * The home page's block as the server renders it while Build is not open to everyone, compared with the block served
 * before Build's card came, byte for byte: every visitor gets exactly that block. The saved markup is
 * `__fixtures__/products-block-today.json`; to save it again after a change made on purpose to today's block, run this
 * spec with `WRITE_TODAY=1`.
 */

const SIGNED_IN = { data: { user: { githubLogin: 'octocat' } }, status: 'authenticated' };
const SIGNED_OUT = { data: null, status: 'unauthenticated' };

const CASES: [name: string, signedIn: boolean, block: ReactElement][] = [
  ['a visitor', false, <ProductsBlockLive key="visitor" contribute />],
  [
    'a visitor, with the live courses',
    false,
    <ProductsBlockLive key="courses" contribute courses={homeLearnCourses} />,
  ],
  ['a visitor, before Contribute is launched', false, <ProductsBlockLive key="learn" contribute={false} />],
  ['a signed-in person', true, <ProductsBlockLive key="signed-in" contribute courses={homeLearnCourses} />],
];

const FILE = join(import.meta.dirname, '__fixtures__', 'products-block-today.json');

const markupOf = (signedIn: boolean, block: ReactElement) => {
  session.current = signedIn ? SIGNED_IN : SIGNED_OUT;
  return renderToStaticMarkup(block);
};

// Once Build is open to everyone, every visitor gets the three cards: `build-open-to-everyone.spec.tsx` checks them.
describe.skipIf(BUILD_OPEN_TO_EVERYONE)("the home page's block served while Build is closed to the viewer", () => {
  if (process.env.WRITE_TODAY) {
    it('saves the markup', () => {
      const today = Object.fromEntries(CASES.map(([name, signedIn, block]) => [name, markupOf(signedIn, block)]));
      writeFileSync(FILE, `${JSON.stringify(today, null, 2)}\n`);
    });
    return;
  }

  const today = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, string>;

  it.each(CASES)("is today's block, byte for byte: %s", (name, signedIn, block) => {
    expect(markupOf(signedIn, block)).toBe(today[name]);
  });

  it('names nothing of Build', () => {
    for (const [, signedIn, block] of CASES) {
      const html = markupOf(signedIn, block);
      expect(html).not.toContain('/build');
      expect(html).not.toContain('GitRanks Build');
    }
  });
});
