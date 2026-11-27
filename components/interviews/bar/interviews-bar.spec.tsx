// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const path = vi.hoisted(() => ({ current: '/interviews' }));

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

const { InterviewsBar } = await import('./interviews-bar');
const { askInterviewsBarAgain, InterviewsBarLive } = await import('./interviews-bar-live');
const { MINE_INTERVIEWS_BAR, VISITOR_INTERVIEWS_BAR } = await import('@/lib/interviews/interviews-bar');
const { barMine, barNone } = await import('@/lib/interviews/__fixtures__/mine');

describe("Interviews' bar", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    hint.present = true;
    path.current = '/interviews';
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  const tabs = () => [...container.querySelectorAll('ul a')].map((a) => a.textContent);
  const current = () => container.querySelector('ul a[aria-current="page"]')?.textContent ?? null;
  const kind = () => container.querySelector('[data-interviews-bar]')?.getAttribute('data-interviews-bar');

  it("draws a visitor's tabs, the current one marked", async () => {
    await act(async () => root.render(<InterviewsBar view={VISITOR_INTERVIEWS_BAR} place="about" />));
    expect(tabs()).toEqual(['Companies', 'How it works']);
    expect(current()).toBe('How it works');
    expect(kind()).toBe('visitor');
    expect(container.querySelector('a[href="/interviews/about"]')).not.toBeNull();
  });

  it("draws My interviews between them for a person with a plan, and marks nothing off Interviews' tabs", async () => {
    await act(async () => root.render(<InterviewsBar view={MINE_INTERVIEWS_BAR} place="mine" />));
    expect(tabs()).toEqual(['Companies', 'My interviews', 'How it works']);
    expect(current()).toBe('My interviews');
    expect(kind()).toBe('mine');
    await act(async () => root.render(<InterviewsBar view={MINE_INTERVIEWS_BAR} place={null} />));
    expect(current()).toBeNull();
  });

  it("reads the person's bar in the browser, again on a move to another page and when a page asks", async () => {
    const fetch = vi.fn(async () => Response.json({ bar: barMine }));
    vi.stubGlobal('fetch', fetch);
    path.current = '/interviews/northwind';
    await act(async () => root.render(<InterviewsBarLive />));
    expect(fetch).toHaveBeenCalledWith('/api/me/interviews/bar', { cache: 'no-store' });
    expect(tabs()).toEqual(['Companies', 'My interviews', 'How it works']);
    expect(current()).toBe('Companies');

    path.current = '/interviews/mine';
    await act(async () => root.render(<InterviewsBarLive />));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(current()).toBe('My interviews');

    fetch.mockImplementation(async () => Response.json({ bar: barNone }));
    await act(async () => askInterviewsBarAgain());
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(tabs()).toEqual(['Companies', 'How it works']);
  });

  it('keeps the bar as it was when a read fails, and asks nothing with no session', async () => {
    const fetch = vi.fn(async () => Response.json({ bar: barMine }));
    vi.stubGlobal('fetch', fetch);
    await act(async () => root.render(<InterviewsBarLive />));
    expect(tabs()).toHaveLength(3);

    fetch.mockImplementation(async () => new Response('down', { status: 502 }));
    path.current = '/interviews/about';
    await act(async () => root.render(<InterviewsBarLive />));
    expect(tabs()).toHaveLength(3);
    expect(current()).toBe('How it works');

    await act(async () => root.unmount());
    root = createRoot(container);
    hint.present = false;
    fetch.mockClear();
    await act(async () => root.render(<InterviewsBarLive />));
    expect(fetch).not.toHaveBeenCalled();
    expect(tabs()).toEqual(['Companies', 'How it works']);
  });
});
