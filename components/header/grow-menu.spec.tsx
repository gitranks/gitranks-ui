// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ pathname: '/' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.pathname }));
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
}));
const hint = vi.hoisted(() => ({ present: true }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { MainMenu } = await import('./components/main-menu');
const { BUILD_READ_WAIT_MS, resetBuildViewer } = await import('@/components/build/build-viewer');
const { readBuildBar } = await import('@/components/build/build-bar-read');
const { resetInterviewsViewer } = await import('@/components/interviews/interviews-viewer');
const { INTERVIEWS_OPEN_TO_EVERYONE } = await import('@/lib/interviews/interviews-parts');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** The routes' answers: the person's bar, and whether Interviews is open to them. */
const answers = (hasBuild: boolean | null = false, interviews = false) =>
  vi.fn(async (url: string) => {
    if (url === '/api/me/interviews/open') return Response.json({ open: interviews });
    if (url === '/api/me/build/bar')
      return Response.json({ bar: hasBuild === null ? null : { hasBuild, tests: null } });
    return new Response('not here', { status: 404 });
  });

describe("the header's Grow menu", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    resetBuildViewer();
    resetInterviewsViewer();
    hint.present = true;
    nav.pathname = '/';
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const render = (menu: ReactNode) => act(async () => root.render(menu));
  /** The row's own items, by their words, from `sm` up. */
  const rowItems = () =>
    [...container.querySelectorAll('nav > div > ul > li:not(.sm\\:hidden) > :is(a, button)')].map((item) =>
      item.textContent?.trim(),
    );
  const growTrigger = () => container.querySelector<HTMLButtonElement>('[data-grow-menu] > button');
  const panel = () => container.querySelector('[data-grow-panel]');
  const entries = (part: Element | null) =>
    [...(part?.querySelectorAll('a') ?? [])].map((a) => ({
      name: a.firstElementChild?.textContent,
      href: a.getAttribute('href'),
      current: a.getAttribute('aria-current'),
    }));

  it('asks nothing for a visitor, and serves Grow with Build marked "New"', async () => {
    hint.present = false;
    const fetch = answers();
    vi.stubGlobal('fetch', fetch);
    await render(<MainMenu />);
    expect(fetch).not.toHaveBeenCalled();
    expect(rowItems()).toEqual(['Rankings', 'Badges', 'Grow']);
    expect(entries(panel())[1]).toEqual({ name: 'BuildNew', href: '/build', current: null });
  });

  it('lists Learn, Build and Contribute under Grow', async () => {
    vi.stubGlobal('fetch', answers(false));
    await render(<MainMenu />);
    expect(rowItems()).toEqual(['Rankings', 'Badges', 'Grow']);
    expect(growTrigger()?.getAttribute('aria-expanded')).toBe('false');
    // The panel below `sm` lists the sections open from the start, under a small label.
    expect(panel()?.querySelector('span')?.textContent).toBe('Grow');
    expect(entries(panel())).toEqual([
      { name: 'Learn', href: '/learn', current: null },
      { name: 'BuildNew', href: '/build', current: null },
      { name: 'Contribute', href: '/contribute', current: null },
    ]);
    expect(panel()?.textContent).toContain('Build a real thing with your agent, step by step');
    expect(panel()?.textContent).not.toContain('Interviews');
    expect(growTrigger()?.hasAttribute('data-active')).toBe(false);
  });

  it('opens its list under the button, as Rankings does', async () => {
    vi.stubGlobal('fetch', answers(false));
    await render(<MainMenu />);
    await act(async () => growTrigger()?.click());
    expect(growTrigger()?.getAttribute('aria-expanded')).toBe('true');
    const list = container.querySelector('[data-grow-menu] [data-slot="navigation-menu-content"]');
    expect(entries(list).map((entry) => entry.name)).toEqual(['Learn', 'BuildNew', 'Contribute']);
    expect(list?.className).toContain('right-0');
  });

  it('keeps "New" at the end of the wait when the bar never answers', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let barSignal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        if (url === '/api/me/interviews/open') return Promise.resolve(Response.json({ open: false }));
        barSignal = init?.signal ?? undefined;
        return new Promise<Response>(() => {});
      }),
    );
    await render(<MainMenu />);
    expect(rowItems()).toEqual(['Rankings', 'Badges', 'Grow']);
    await act(async () => vi.advanceTimersByTimeAsync(BUILD_READ_WAIT_MS));
    expect(entries(panel())[1].name).toBe('BuildNew');
    expect(barSignal?.aborted).toBe(true);
  });

  it("takes the bar Build's own bar read a moment ago, so a Build page reads it once", async () => {
    const fetch = answers(true);
    vi.stubGlobal('fetch', fetch);
    await readBuildBar();
    await render(<MainMenu section="build" />);
    expect(entries(panel())[1].name).toBe('Build');
    expect(fetch.mock.calls.filter(([url]) => url === '/api/me/build/bar')).toHaveLength(1);
  });

  it('drops "New" once the person has a build, and keeps it while the bar is not known', async () => {
    vi.stubGlobal('fetch', answers(true));
    await render(<MainMenu />);
    expect(entries(panel())[1].name).toBe('Build');

    await act(async () => root.unmount());
    root = createRoot(container);
    resetBuildViewer();
    vi.stubGlobal('fetch', answers(null));
    await render(<MainMenu />);
    expect(entries(panel())[1].name).toBe('BuildNew');
  });

  it("marks Grow, and the section in its list, on a section's pages", async () => {
    vi.stubGlobal('fetch', answers(true));
    await render(<MainMenu section="build" />);
    expect(growTrigger()?.hasAttribute('data-active')).toBe(true);
    expect(entries(panel()).map((entry) => entry.current)).toEqual([null, 'page', null]);

    await render(<MainMenu section="rankings" />);
    expect(growTrigger()?.hasAttribute('data-active')).toBe(false);
    expect(entries(panel()).every((entry) => entry.current === null)).toBe(true);

    nav.pathname = '/learn/courses/algorithms';
    await render(<MainMenu />);
    expect(entries(panel()).map((entry) => entry.current)).toEqual(['page', null, null]);
    nav.pathname = '/my/settings';
    await render(<MainMenu key="workspace" />);
    expect(growTrigger()?.hasAttribute('data-active')).toBe(false);
  });

  it('asks once a page: the next header is drawn with Grow at once', async () => {
    const fetch = answers(false);
    vi.stubGlobal('fetch', fetch);
    // The bar, and whether Interviews is open.
    const asks = 1 + (INTERVIEWS_OPEN_TO_EVERYONE ? 0 : 1);
    await render(<MainMenu />);
    expect(fetch).toHaveBeenCalledTimes(asks);
    await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(<MainMenu />));
    expect(rowItems()).toEqual(['Rankings', 'Badges', 'Grow']);
    expect(fetch).toHaveBeenCalledTimes(asks);
  });

  it('is served with Grow and Build in every section', () => {
    for (const section of [undefined, 'rankings', 'badges', 'learn', 'contribute'] as const) {
      const html = renderToStaticMarkup(<MainMenu section={section} />);
      expect(html).toMatch(/<button [^>]*>Grow/);
      expect(html).toContain('href="/build"');
    }
  });

  it("is served with Grow on Build's own pages, Build marked", async () => {
    const html = renderToStaticMarkup(<MainMenu section="build" />);
    expect(html).toMatch(/<button [^>]*>Grow/);
    expect(html).toMatch(/href="\/build"[^>]*aria-current="page"[^>]*><span[^>]*>Build<span[^>]*>New<\/span>/);
    // "New" still follows the person's bar.
    vi.stubGlobal('fetch', answers(true));
    await render(<MainMenu section="build" />);
    expect(entries(panel())[1].name).toBe('Build');
  });

  it('lists Interviews last for a person it is open to', async () => {
    vi.stubGlobal('fetch', answers(true, true));
    await render(<MainMenu />);
    expect(entries(panel()).map((entry) => entry.name)).toEqual(['Learn', 'Build', 'Contribute', 'Interviews']);
  });

  it.skipIf(INTERVIEWS_OPEN_TO_EVERYONE)('leaves Interviews out for a person it is not open to', async () => {
    vi.stubGlobal('fetch', answers(false, false));
    await render(<MainMenu />);
    expect(entries(panel()).map((entry) => entry.name)).toEqual(['Learn', 'BuildNew', 'Contribute']);
    expect(container.innerHTML).not.toContain('/interviews');
  });

  it("is served with Grow on Interviews' own pages, Interviews marked", () => {
    const html = renderToStaticMarkup(<MainMenu section="interviews" />);
    expect(html).toMatch(/<button [^>]*>Grow/);
    expect(html).toMatch(/href="\/interviews"[^>]*aria-current="page"[^>]*><span[^>]*>Interviews<\/span>/);
  });

  it("marks Interviews by the path on Interviews' pages", async () => {
    vi.stubGlobal('fetch', answers(null, true));
    nav.pathname = '/interviews/northwind';
    await render(<MainMenu />);
    expect(entries(panel()).map((entry) => entry.current)).toEqual([null, null, null, 'page']);
  });

  it.skipIf(INTERVIEWS_OPEN_TO_EVERYONE)(
    'is served with no link to Interviews while Interviews is not open to everyone',
    () => {
      for (const section of [undefined, 'rankings', 'badges', 'learn', 'contribute', 'build'] as const) {
        expect(renderToStaticMarkup(<MainMenu section={section} />)).not.toContain('/interviews');
      }
    },
  );
});
