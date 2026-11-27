import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/react', () => ({ signIn: vi.fn(), signOut: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/components/signin-button/signin-button', () => ({ default: () => <span data-sign-in-button /> }));
const nav = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));

const { Header } = await import('./header');
const { BUILD_OPEN_TO_EVERYONE } = await import('@/lib/build/built-parts');
const { INTERVIEWS_OPEN_TO_EVERYONE } = await import('@/lib/interviews/interviews-parts');

/*
 * The header as the server renders it while Build is not open to everyone, compared with the header served before
 * Build's Grow menu came, byte for byte: every visitor gets exactly that header. `__fixtures__/header-today.json`
 * keeps each case's SHA-256 (the logo alone makes the markup long); to save them again after a change made on purpose
 * to today's header, run this spec with `WRITE_TODAY=1`.
 */

const CASES: [name: string, pathname: string, header: ReactElement][] = [
  ['home', '/', <Header key="home" />],
  ['profile', '/profile/octocat', <Header key="profile" title="octocat" />],
  ['rankings', '/by/stars/1', <Header key="rankings" section="rankings" />],
  ['badges', '/badge/gallery', <Header key="badges" section="badges" />],
  ['learn', '/learn', <Header key="learn" section="learn" />],
  ['contribute', '/contribute', <Header key="contribute" section="contribute" />],
  ['learn by its path', '/learn/courses/algorithms', <Header key="learn-path" />],
  ['contribute by its path', '/contribute/issues', <Header key="contribute-path" />],
  ['the workspace', '/my/settings', <Header key="workspace" />],
];

const FILE = join(import.meta.dirname, '__fixtures__', 'header-today.json');

const markupOf = (pathname: string, header: ReactElement) => {
  nav.pathname = pathname;
  return renderToStaticMarkup(header);
};

const hashOf = (markup: string) => createHash('sha256').update(markup).digest('hex');

// Once Build is open to everyone, every visitor gets Grow: `build-open-to-everyone.spec.tsx` checks that header.
describe.skipIf(BUILD_OPEN_TO_EVERYONE)('the header served while Build is closed to the viewer', () => {
  if (process.env.WRITE_TODAY) {
    it('saves the markup', () => {
      const today = Object.fromEntries(
        CASES.map(([name, pathname, header]) => [name, hashOf(markupOf(pathname, header))]),
      );
      writeFileSync(FILE, `${JSON.stringify(today, null, 2)}\n`);
    });
    return;
  }

  const today = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, string>;

  it.each(CASES)("is today's header, byte for byte: %s", (name, pathname, header) => {
    expect(hashOf(markupOf(pathname, header))).toBe(today[name]);
  });

  it('names nothing of Build', () => {
    for (const [, pathname, header] of CASES) {
      const html = markupOf(pathname, header);
      expect(html).not.toContain('/build');
      expect(html).not.toContain('Grow');
    }
  });

  it.skipIf(INTERVIEWS_OPEN_TO_EVERYONE)('names nothing of Interviews', () => {
    for (const [, pathname, header] of CASES) {
      const html = markupOf(pathname, header);
      expect(html).not.toContain('/interviews');
      expect(html).not.toContain('Interviews');
    }
  });
});
