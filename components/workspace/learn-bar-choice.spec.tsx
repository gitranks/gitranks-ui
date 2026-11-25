// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const at = vi.hoisted(() => ({ path: '/my/settings', search: '' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => at.path,
  useSearchParams: () => new URLSearchParams(at.search),
}));
vi.mock('@/lib/workspace/actions', () => ({
  readWorkspaceChanges: vi.fn(async () => ({ ok: false })),
  readNeedsYouCount: vi.fn(async () => ({ ok: false })),
}));

const { WorkspaceTabsNav } = await import('./workspace-tabs-nav');
const { changesPollRunning } = await import('@/lib/workspace/changes-bus');

import type { Audience } from '@/lib/workspace/audience';
import type { ContributeActivity } from '@/lib/workspace/contribute.types';
import type { WorkspaceTab } from '@/lib/workspace/gate';
import { lastBarInCookies, type ProductBar, settingsBarOf } from '@/lib/workspace/settings-bar';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TABS: WorkspaceTab[] = ['contribute', 'pull-requests', 'agent', 'settings'];
const LEARN = <nav data-bar="learn" />;

/** Work on Settings: the stack being read, so the work's bar shows there. */
const READING: ContributeActivity = {
  items: [
    {
      kind: 'STACK_RESOLVE',
      tabs: ['SETTINGS'],
      label: 'Reading your stack',
      done: 1,
      total: 4,
      startedAt: '2026-11-23T10:00:00.000Z',
      expectedAt: null,
      repos: [],
    },
  ],
  runs: [],
  readAt: '2026-11-23T10:00:00.000Z',
};

const setCookie = (value: string | null) => {
  // biome-ignore lint/suspicious/noDocumentCookie: the spec sets the bar seen last.
  document.cookie = value ? `gr_last_bar=${value}; Path=/` : 'gr_last_bar=; Path=/; Max-Age=0';
};

type Choice = { audience?: Audience; lastBar?: ProductBar | null; withLearn?: boolean; tabs?: WorkspaceTab[] };

const nav = ({ audience = 'both', lastBar = null, withLearn = true, tabs = TABS }: Choice = {}) => (
  <WorkspaceTabsNav
    tabs={tabs}
    activity={READING}
    version="4.2"
    learn={withLearn ? { bar: LEARN, audience, lastBar } : undefined}
  />
);

describe('the bar on the workspace pages', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    setCookie(null);
    at.path = '/my/settings';
    at.search = '';
  });

  const shown = (choice: Choice = {}) => {
    act(() => root.render(nav(choice)));
    if (container.querySelector('[data-bar="learn"]')) return 'learn';
    if (container.querySelector('[data-workspace-tabs]')) return 'contribute';
    return null;
  };

  it("shows Learn's bar on Settings opened from Learn, and on its own pages", () => {
    at.search = 'from=learn';
    expect(shown()).toBe('learn');
    at.path = '/my/settings/github';
    expect(shown()).toBe('learn');
  });

  it("shows the bar seen last, read again on each move, else Learn's for someone who only learns", () => {
    expect(shown()).toBe('contribute');
    setCookie('learn');
    expect(shown()).toBe('learn');
    setCookie('contribute');
    expect(shown({ audience: 'learner' })).toBe('contribute');
    setCookie(null);
    expect(shown({ audience: 'learner' })).toBe('learn');
  });

  it("keeps the workspace's tabs elsewhere, and where no Learn bar is given", () => {
    setCookie('learn');
    at.path = '/my/pull-requests';
    at.search = 'from=learn';
    expect(shown()).toBe('contribute');
    at.path = '/my/settings';
    expect(shown({ withLearn: false })).toBe('contribute');
  });

  it("keeps the check for updates and the work's bar under Learn's bar, once, on Settings and its own pages", () => {
    at.search = 'from=learn';
    for (const path of ['/my/settings', '/my/settings/work']) {
      at.path = path;
      expect(shown()).toBe('learn');
      expect(changesPollRunning()).toBe(true);
      expect(container.querySelectorAll('[data-activity-bar]')).toHaveLength(1);
      expect(container.textContent).toContain('Reading your stack');
    }
    // A move to a page with the tabs keeps the same check running: the bars change, the poll does not restart.
    at.path = '/my/pull-requests';
    at.search = '';
    expect(shown()).toBe('contribute');
    expect(changesPollRunning()).toBe(true);
  });

  it("shows Learn's bar alone, with no poll, before the person has entered the workspace", () => {
    at.search = 'from=learn';
    expect(shown({ tabs: [] })).toBe('learn');
    expect(container.querySelector('[data-activity-bar]')).toBeNull();
    expect(changesPollRunning()).toBe(false);
  });

  it("draws the server's read of the cookie before the page is up", () => {
    expect(renderToStaticMarkup(nav({ lastBar: 'learn' }))).toContain('data-bar="learn"');
    expect(renderToStaticMarkup(nav({ lastBar: 'contribute' }))).toContain('data-workspace-tabs');
  });

  /*
   * The bar seen last is read by Settings (its bar and the order of its groups), the player's header and the empty
   * list of pull requests, each through `settingsBarOf` with no `from` on a later page: a page Learn owns must leave it.
   */
  const laterPageShows = () =>
    settingsBarOf({ from: null, lastBar: lastBarInCookies(document.cookie), audience: 'both' });

  it.each([
    ["a lesson's Start page", '/my/start/acme/widgets/42', 'lesson=1'],
    ["Learn's Pull requests", '/my/pull-requests', 'from=learn'],
    ['a pull request opened from Learn', '/my/pull-requests/acme/widgets/42', 'from=learn'],
    ["an issue's page opened from Learn", '/my/issues/M_1', 'from=learn'],
  ])("keeps Learn's bar the one seen last on %s, for every reader of it", (_page, path, search) => {
    setCookie('learn');
    at.path = path;
    at.search = search;
    expect(shown({ lastBar: 'learn' })).toBe('contribute');
    expect(lastBarInCookies(document.cookie)).toBe('learn');
    expect(laterPageShows()).toBe('learn');
  });

  it.each([
    ['Contribute', '/contribute', ''],
    ['a Start page', '/my/start/acme/widgets/42', ''],
    ['the list of pull requests', '/my/pull-requests', ''],
    ["an issue's page opened from Contribute", '/my/issues/M_1', 'from=contribute'],
    ['the Agent page', '/my/agent', ''],
  ])("records the workspace's bar as the one seen last on %s, for every reader of it", (_page, path, search) => {
    setCookie('learn');
    at.path = path;
    at.search = search;
    expect(shown({ lastBar: 'learn' })).toBe('contribute');
    expect(lastBarInCookies(document.cookie)).toBe('contribute');
    expect(laterPageShows()).toBe('contribute');
  });

  it("writes the workspace's bar again on each move between its tabs, after Learn wrote its own in another browser tab", () => {
    at.path = '/my/agent';
    expect(shown()).toBe('contribute');
    expect(lastBarInCookies(document.cookie)).toBe('contribute');
    // Learn, opened in another browser tab, records its bar.
    setCookie('learn');
    at.path = '/my/pull-requests';
    expect(shown()).toBe('contribute');
    expect(lastBarInCookies(document.cookie)).toBe('contribute');
    setCookie('learn');
    at.path = '/contribute';
    expect(shown()).toBe('contribute');
    expect(lastBarInCookies(document.cookie)).toBe('contribute');
    // A move to a page Learn owns leaves Learn's.
    setCookie('learn');
    at.path = '/my/pull-requests';
    at.search = 'from=learn';
    expect(shown()).toBe('contribute');
    expect(lastBarInCookies(document.cookie)).toBe('learn');
  });
});
