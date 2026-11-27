// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const path = vi.hoisted(() => ({ current: '/build' }));

vi.mock('next/navigation', () => ({
  usePathname: () => path.current,
}));
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    ...rest
  }: {
    href: string;
    children: ReactNode;
    prefetch?: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));
vi.mock('@/components/navigation-progress/navigation-progress', () => ({ useReportPendingNavigation: () => {} }));
const hint = vi.hoisted(() => ({ present: true }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { BuildBar } = await import('./build-bar');
const { BuildBarLive } = await import('./build-bar-live');
const { buildBarViewOf, VISITOR_BUILD_BAR } = await import('@/lib/build/build-bar');
const { barBuilder, barTwoTests } = await import('@/lib/build/__fixtures__/builds');

describe("Build's bar", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    hint.present = true;
    path.current = '/build';
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  const tabs = () => [...container.querySelectorAll('ul a')].map((a) => a.textContent);
  const current = () => container.querySelector('ul a[aria-current="page"]')?.textContent ?? null;
  const testItem = () => container.querySelector<HTMLAnchorElement>('[data-learn-bar-item="build-test"]');

  it("draws a visitor's tabs, the current one marked, and nothing on the right", async () => {
    await act(async () => root.render(<BuildBar view={VISITOR_BUILD_BAR} place="projects" />));
    expect(tabs()).toEqual(['Home', 'Projects']);
    expect(current()).toBe('Projects');
    expect(testItem()).toBeNull();
    expect(container.querySelector('[data-build-bar]')?.getAttribute('data-build-bar')).toBe('visitor');
  });

  it("draws a builder's tabs, and Test with how many when tests wait", async () => {
    await act(async () => root.render(<BuildBar view={buildBarViewOf(barTwoTests)} place="mine" />));
    expect(tabs()).toEqual(['Home', 'Projects', 'My builds', 'Settings']);
    expect(current()).toBe('My builds');
    expect(container.querySelector('a[href="/my/settings?from=build"]')?.textContent).toBe('Settings');
    expect(testItem()?.getAttribute('href')).toBe('/build/mine');
    expect(testItem()?.textContent).toBe('Test 2 tests wait');
    expect(testItem()?.getAttribute('aria-current')).toBeNull();
  });

  it('says one test in the singular, and draws no Test for none', async () => {
    await act(async () => root.render(<BuildBar view={{ ...buildBarViewOf(barBuilder), tests: 1 }} place={null} />));
    expect(testItem()?.textContent).toBe('Test 1 test waits');
    expect(current()).toBeNull();
    await act(async () => root.render(<BuildBar view={buildBarViewOf(barBuilder)} place={null} />));
    expect(testItem()).toBeNull();
    expect(container.textContent).not.toMatch(/\b0\b/);
  });

  it("reads the person's bar in the browser, and again on a move to another page", async () => {
    const fetch = vi.fn(async () => Response.json({ bar: barTwoTests }));
    vi.stubGlobal('fetch', fetch);
    await act(async () => root.render(<BuildBarLive />));
    expect(fetch).toHaveBeenCalledWith('/api/me/build/bar', { cache: 'no-store' });
    expect(tabs()).toEqual(['Home', 'Projects', 'My builds', 'Settings']);
    expect(current()).toBe('Home');
    expect(testItem()?.textContent).toBe('Test 2 tests wait');

    path.current = '/build/mine';
    await act(async () => root.render(<BuildBarLive />));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(current()).toBe('My builds');
  });

  it('keeps the bar as it was when a read fails, and asks nothing with no session', async () => {
    const fetch = vi.fn(async () => Response.json({ bar: barBuilder }));
    vi.stubGlobal('fetch', fetch);
    await act(async () => root.render(<BuildBarLive />));
    expect(tabs()).toHaveLength(4);

    fetch.mockImplementation(async () => new Response('down', { status: 502 }));
    path.current = '/build/projects';
    await act(async () => root.render(<BuildBarLive />));
    expect(tabs()).toHaveLength(4);
    expect(current()).toBe('Projects');

    await act(async () => root.unmount());
    root = createRoot(container);
    hint.present = false;
    fetch.mockClear();
    await act(async () => root.render(<BuildBarLive />));
    expect(fetch).not.toHaveBeenCalled();
    expect(tabs()).toEqual(['Home', 'Projects']);
  });

  it('marks Settings only when the page says Build opened it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ bar: barBuilder })),
    );
    path.current = '/my/settings';
    await act(async () => root.render(<BuildBarLive />));
    expect(current()).toBeNull();
    await act(async () => root.render(<BuildBarLive from="build" />));
    expect(current()).toBe('Settings');
  });
});
