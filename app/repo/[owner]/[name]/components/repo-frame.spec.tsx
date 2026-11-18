import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bigRepo, bigRepoPulse, repoLanguages, repoRankTiers, youngRepo } from '../__fixtures__/repo';
import { RepoBadgeRow, RepoFrame } from './repo-frame';
import { RepoLayout } from './repo-layout';
import { RepoScreen } from './repo-screen';
import { repoBig } from '@/badge/v3/fixtures';
import { threePackages } from '@/components/dependents/dependents.fixtures';

const { pathname } = vi.hoisted(() => ({ pathname: { current: '/repo/nebula/ui' } }));
vi.mock('next/navigation', () => ({ usePathname: () => pathname.current, useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'loading' }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const NOW = Date.parse('2026-10-28T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: NOW });
  pathname.current = '/repo/nebula/ui';
});
afterEach(() => {
  vi.useRealTimers();
});

const render = (element: ReactElement) => renderToStaticMarkup(element);
const text = (html: string) => html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '');

/** Each tab's label and count as its link reads, and whether it is the open one. */
const tabs = (html: string) =>
  [...html.matchAll(/<li class="shrink-0[^"]*"><a ([^>]*)>([\s\S]*?)<\/a><\/li>/g)].map(([, attrs, inner]) => ({
    text: text(inner).trim(),
    open: attrs.includes('aria-current="page"'),
  }));

const frame = (props: Partial<Parameters<typeof RepoFrame>[0]> = {}) =>
  render(
    <RepoFrame repo={bigRepo} packages={threePackages} contributors={12} badgeFacts={repoBig} {...props}>
      <p>tab</p>
    </RepoFrame>,
  );

describe('RepoFrame', () => {
  it('draws Overview, Used by with its count and Contributors with its count, as the board does', () => {
    expect(tabs(frame())).toEqual([
      { text: 'Overview', open: true },
      { text: 'Used by 231', open: false },
      { text: 'Contributors 12', open: false },
    ]);
  });

  it('opens Overview at the address the proxy draws it at as well, so the drawing and the browser agree', () => {
    pathname.current = '/repo/nebula/ui/overview';
    expect(tabs(frame())[0]).toEqual({ text: 'Overview', open: true });

    pathname.current = '/repo/nebula/ui/used-by';
    expect(tabs(frame()).map(({ open }) => open)).toEqual([false, true, false]);
  });

  it('puts the tabs in a navigation landmark named for the repository', () => {
    expect(frame()).toMatch(/<nav aria-label="Repository"><div[^>]*><ul/);
  });

  it('has no Used by tab for a repository that publishes no package', () => {
    expect(tabs(frame({ packages: null })).map(({ text: label }) => label)).toEqual(['Overview', 'Contributors 12']);
  });

  it('draws Used by without a count while package data cannot be read, and with none of zero', () => {
    expect(tabs(frame({ packages: 'unavailable' }))[1]).toEqual({ text: 'Used by', open: false });
    expect(tabs(frame({ packages: { ...threePackages, dependents: 0 } }))[1]).toEqual({ text: 'Used by', open: false });
  });

  it('draws Contributors without a count without analytics', () => {
    expect(tabs(frame({ contributors: null }))[2]).toEqual({ text: 'Contributors', open: false });
  });

  it('puts the tab inside the left column frame, after the Badge row', () => {
    const html = frame();

    expect(html.indexOf('<h1')).toBeLessThan(html.indexOf('>Badge<'));
    expect(html.indexOf('>Badge<')).toBeLessThan(html.indexOf('<p>tab</p>'));
    expect(html).toContain('All badges');
    expect(html).not.toContain('See all badges');
  });
});

describe('RepoBadgeRow', () => {
  it('draws one promoted badge, linking to its code, and All badges', () => {
    const html = render(<RepoBadgeRow facts={repoBig} />);

    expect(html.match(/<a /g)).toHaveLength(2);
    expect(html.match(/<img /g)).toHaveLength(2);
    expect(html).toContain('href="/badge/builder?repo=nebula/ui"');
  });

  it('draws nothing without badge data', () => {
    expect(render(<RepoBadgeRow facts={null} />)).toBe('');
  });
});

describe("today's repository page", () => {
  it('keeps its left column: no Badge row, no tabs', () => {
    const html = render(
      <RepoScreen
        repo={bigRepo}
        pulse={bigRepoPulse}
        languages={repoLanguages}
        tiers={repoRankTiers}
        badgeFacts={repoBig}
      />,
    );

    expect(html).not.toContain('>Badge<');
    expect(html).not.toContain('All badges');
    expect(html).not.toContain('aria-current');
    expect(html).not.toContain('used-by');
  });

  it('keeps the archived chip as it was', () => {
    const html = render(
      <RepoLayout repo={{ ...youngRepo, isArchived: true }}>
        <p />
      </RepoLayout>,
    );

    expect(html).toContain(
      '<span class="self-start rounded-sm bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">Archived</span>',
    );
  });
});
