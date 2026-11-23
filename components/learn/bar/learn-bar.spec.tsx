// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const path = vi.hoisted(() => ({ current: '/learn' }));

vi.mock('next/navigation', () => ({
  usePathname: () => path.current,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
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
vi.mock('@/lib/workspace/actions', () => ({ readWorkspaceChanges: vi.fn(), readNeedsYouCount: vi.fn() }));

const { LearnBar } = await import('./learn-bar');
const { LearnBarLive } = await import('./learn-bar-live');
const { learnBarRows, learnBarPhoneRows } = await import('@/lib/learn/__fixtures__/learn-bar');

describe("Learn's bar", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  const tabs = () => [...container.querySelectorAll('ul a')].map((a) => a.textContent);
  const current = () => [...container.querySelectorAll('[aria-current="page"]')].map((a) => a.textContent);
  const items = () =>
    [...container.querySelectorAll('[data-learn-bar-item]')].map((a) => [a.getAttribute('href'), a.textContent]);

  /** What each row of page 7's board shows: the tabs, the current place, and the right side. */
  const expected = [
    { tabs: 3, current: ['Home'], items: [] },
    { tabs: 3, current: ['Home'], items: [['/learn/setup', 'Set up Learn']] },
    { tabs: 5, current: ['Home'], items: [] },
    { tabs: 5, current: ['Home'], items: [['/learn/review', 'Review6 lessons due']] },
    {
      tabs: 5,
      current: ['Home'],
      items: [
        ['/my/pull-requests?from=learn', 'Pull requests'],
        ['/learn/review', 'Review6 lessons due'],
      ],
    },
    {
      tabs: 5,
      current: ['Home'],
      items: [
        ['/my/pull-requests?from=learn', 'Pull requests1 need you'],
        ['/learn/review', 'Review6 lessons due'],
      ],
    },
    {
      tabs: 5,
      current: ['Pull requests1 need you'],
      items: [
        ['/my/pull-requests?from=learn', 'Pull requests1 need you'],
        ['/learn/review', 'Review6 lessons due'],
      ],
    },
    { tabs: 5, current: ['Settings'], items: [['/learn/review', 'Review6 lessons due']] },
  ];

  it.each(learnBarRows.map((row, index) => [row.title, row, expected[index]] as const))(
    'draws %s',
    async (_title, row, want) => {
      await act(async () => root.render(<LearnBar state={row.state} place={row.place} />));
      expect(tabs()).toHaveLength(want.tabs);
      expect(current()).toEqual(want.current);
      expect(items()).toEqual(want.items);
    },
  );

  it('draws the phone rows with the same parts', async () => {
    for (const row of learnBarPhoneRows) {
      await act(async () => root.render(<LearnBar state={row.state} place={row.place} />));
      expect(container.querySelector('[data-learn-bar]')?.getAttribute('data-learn-bar')).toBe(row.state.kind);
    }
  });

  it('says one lesson due in the singular', async () => {
    const state = { kind: 'learner' as const, due: 1, pullRequests: false, pullRequestsNeedYou: 0 };
    await act(async () => root.render(<LearnBar state={state} place={null} />));
    expect(items()).toEqual([['/learn/review', 'Review1 lesson due']]);
  });

  it("starts as a visitor's bar and reads the person's in the browser, again on each new page", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ bar: { setup: 'SAVED', due: 2, pullRequests: false, pullRequestsNeedYou: 0 } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    path.current = '/learn/courses';
    await act(async () => root.render(<LearnBarLive />));
    expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/bar', { cache: 'no-store' });
    expect(tabs()).toHaveLength(5);
    expect(current()).toEqual(['Courses']);
    expect(items()).toEqual([['/learn/review', 'Review2 lessons due']]);

    path.current = '/learn/courses/algorithms';
    await act(async () => root.render(<LearnBarLive />));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps a visitor's bar when the read fails", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    );
    path.current = '/learn/courses';
    await act(async () => root.render(<LearnBarLive />));
    expect(tabs()).toEqual(['Home', 'Courses', 'Issues']);
    expect(items()).toEqual([]);
  });
});
