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
const { BUILD_OPEN_TO_EVERYONE } = await import('@/lib/build/built-parts');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** The routes' answers: whether Build is open to the person, and their bar. */
const answers = (open: boolean, hasBuild: boolean | null = false) =>
  vi.fn(async (url: string) => {
    if (url === '/api/me/build/open') return Response.json({ open });
    if (url === '/api/me/build/bar')
      return Response.json({ bar: hasBuild === null ? null : { hasBuild, tests: null } });
    return new Response('not here', { status: 404 });
  });

describe("the header's Grow menu", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    resetBuildViewer();
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

  it.skipIf(BUILD_OPEN_TO_EVERYONE)("asks nothing for a visitor, and keeps today's menu", async () => {
    hint.present = false;
    const fetch = answers(true);
    vi.stubGlobal('fetch', fetch);
    await render(<MainMenu />);
    expect(fetch).not.toHaveBeenCalled();
    expect(rowItems()).toEqual(['Rankings', 'Badges', 'Contribute', 'LearnNew']);
    expect(container.innerHTML).not.toContain('/build');
  });

  it.skipIf(BUILD_OPEN_TO_EVERYONE)(
    "keeps today's menu, unchanged, for a person Build is not open to, and reads no bar",
    async () => {
      const fetch = answers(false);
      vi.stubGlobal('fetch', fetch);
      await render(<MainMenu />);
      const served = container.innerHTML;
      await act(async () => {});
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('/api/me/build/open', expect.objectContaining({ cache: 'no-store' }));
      expect(container.innerHTML).toBe(served);
      expect(container.innerHTML).not.toContain('Grow');
    },
  );

  it('puts Grow in the place of Contribute and Learn for a person Build is open to', async () => {
    vi.stubGlobal('fetch', answers(true, false));
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
    vi.stubGlobal('fetch', answers(true, false));
    await render(<MainMenu />);
    await act(async () => growTrigger()?.click());
    expect(growTrigger()?.getAttribute('aria-expanded')).toBe('true');
    const list = container.querySelector('[data-grow-menu] [data-slot="navigation-menu-content"]');
    expect(entries(list).map((entry) => entry.name)).toEqual(['Learn', 'BuildNew', 'Contribute']);
    expect(list?.className).toContain('right-0');
  });

  it.skipIf(BUILD_OPEN_TO_EVERYONE)(
    'changes at the end of the wait, with "New", when the bar never answers',
    async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      let barSignal: AbortSignal | undefined;
      vi.stubGlobal(
        'fetch',
        vi.fn((url: string, init?: RequestInit) => {
          if (url === '/api/me/build/open') return Promise.resolve(Response.json({ open: true }));
          barSignal = init?.signal ?? undefined;
          return new Promise<Response>(() => {});
        }),
      );
      await render(<MainMenu />);
      await act(async () => vi.advanceTimersByTimeAsync(BUILD_READ_WAIT_MS - 1));
      expect(rowItems()).toEqual(['Rankings', 'Badges', 'Contribute', 'LearnNew']);
      await act(async () => vi.advanceTimersByTimeAsync(1));
      expect(rowItems()).toEqual(['Rankings', 'Badges', 'Grow']);
      expect(entries(panel())[1].name).toBe('BuildNew');
      expect(barSignal?.aborted).toBe(true);
    },
  );

  it.skipIf(BUILD_OPEN_TO_EVERYONE)('stays closed when whether Build is open never answers', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const fetch = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetch);
    await render(<MainMenu />);
    await act(async () => vi.advanceTimersByTimeAsync(BUILD_READ_WAIT_MS * 3));
    expect(rowItems()).toEqual(['Rankings', 'Badges', 'Contribute', 'LearnNew']);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("takes the bar Build's own bar read a moment ago, so a Build page reads it once", async () => {
    const fetch = answers(true, true);
    vi.stubGlobal('fetch', fetch);
    await readBuildBar();
    await render(<MainMenu section="build" />);
    expect(entries(panel())[1].name).toBe('Build');
    expect(fetch.mock.calls.filter(([url]) => url === '/api/me/build/bar')).toHaveLength(1);
  });

  it('drops "New" once the person has a build, and keeps it while the bar is not known', async () => {
    vi.stubGlobal('fetch', answers(true, true));
    await render(<MainMenu />);
    expect(entries(panel())[1].name).toBe('Build');

    await act(async () => root.unmount());
    root = createRoot(container);
    resetBuildViewer();
    vi.stubGlobal('fetch', answers(true, null));
    await render(<MainMenu />);
    expect(entries(panel())[1].name).toBe('BuildNew');
  });

  it("marks Grow, and the section in its list, on a section's pages", async () => {
    vi.stubGlobal('fetch', answers(true, true));
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
    const fetch = answers(true, false);
    vi.stubGlobal('fetch', fetch);
    // Whether Build is open (not asked once it is open to everyone), then the bar.
    const asks = BUILD_OPEN_TO_EVERYONE ? 1 : 2;
    await render(<MainMenu />);
    expect(fetch).toHaveBeenCalledTimes(asks);
    await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(<MainMenu />));
    expect(rowItems()).toEqual(['Rankings', 'Badges', 'Grow']);
    expect(fetch).toHaveBeenCalledTimes(asks);
  });

  it.skipIf(BUILD_OPEN_TO_EVERYONE)(
    'is served with no Grow and no link to Build while Build is not open to everyone',
    () => {
      for (const section of [undefined, 'rankings', 'badges', 'learn', 'contribute'] as const) {
        const html = renderToStaticMarkup(<MainMenu section={section} />);
        expect(html).not.toContain('Grow');
        expect(html).not.toContain('/build');
      }
    },
  );

  it("is served with Grow on Build's own pages, which reach only people Build is open to", async () => {
    const html = renderToStaticMarkup(<MainMenu section="build" />);
    expect(html).toMatch(/<button [^>]*>Grow/);
    expect(html).toMatch(/href="\/build"[^>]*aria-current="page"[^>]*><span[^>]*>Build<span[^>]*>New<\/span>/);
    // "New" still follows the person's bar.
    vi.stubGlobal('fetch', answers(true, true));
    await render(<MainMenu section="build" />);
    expect(entries(panel())[1].name).toBe('Build');
  });
});
