import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const nav = vi.hoisted(() => ({ pathname: '/contribute', search: '' }));
const data = vi.hoisted(() => ({
  loadContributeActivity: vi.fn(async () => null),
  loadContributeVersion: vi.fn(async () => '4.2'),
  loadNeedsYouCount: vi.fn(async (): Promise<number | null> => 3),
}));
const gate = vi.hoisted(() => ({ loadWorkspaceGate: vi.fn() }));

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock('next-auth/react', () => ({ useSession: () => ({ data: null, status: 'unauthenticated' }) }));
vi.mock('@/components/signin-button/signin-button', () => ({ default: () => <span data-avatar-menu /> }));
vi.mock('@/components/navigation-progress/navigation-progress', () => ({ useReportPendingNavigation: () => {} }));
vi.mock('@/lib/workspace/actions', () => ({ readWorkspaceChanges: vi.fn(), readNeedsYouCount: vi.fn() }));
vi.mock('@/lib/workspace/contribute.data', () => data);
vi.mock('@/lib/workspace/gate.data', () => gate);

const { WorkspaceTabsNav } = await import('./workspace-tabs-nav');
const { WorkspaceTabs } = await import('./workspace-tabs');
const { HeaderLine } = await import('./header-line');
const { default: WorkspaceLayout } = await import('@/app/(workspace)/layout');
const { tabsOf } = await import('@/lib/workspace/gate');
const { activeTabOf, workspaceTabsShown } = await import('@/lib/workspace/workspace-tabs');
const { activityOf, QUEUED, READY, WORKING, FOLLOW_UP } = await import('@/lib/contribute/__fixtures__/agent-runs');

import type { WorkspaceGate, WorkspaceTab } from '@/lib/workspace/gate';

const ALL: WorkspaceTab[] = ['contribute', 'learn', 'pull-requests', 'agent', 'settings'];
const NO_LEARN: WorkspaceTab[] = ['contribute', 'pull-requests', 'agent', 'settings'];

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replace(/\s+/g, ' ')
    .trim();

/** The tab links, as the site's tabs draw them. */
const tabLinks = (html: string) => html.match(/<a [^>]*data-workspace-tab="[^"]+"[^>]*>/g) ?? [];
/** The tab marked as the current page: filled underline, and `aria-current` for screen readers, on the same link. */
const currentTab = (html: string) => {
  const filled = tabLinks(html).filter((link) => link.includes('border-foreground'));
  const named = tabLinks(html).filter((link) => link.includes('aria-current="page"'));
  expect(named).toEqual(filled);
  return filled.map((link) => link.match(/data-workspace-tab="([^"]+)"/)?.[1]);
};
const tabsAt = (pathname: string, search = '', props: Partial<Parameters<typeof WorkspaceTabsNav>[0]> = {}) => {
  nav.pathname = pathname;
  nav.search = search;
  return renderToStaticMarkup(<WorkspaceTabsNav tabs={ALL} {...props} />);
};

const open = (over: Partial<Extract<WorkspaceGate, { kind: 'open' }>> = {}): WorkspaceGate => ({
  kind: 'open',
  entered: true,
  agents: { hosted: true, own: false },
  learnOpen: true,
  ...over,
});

beforeEach(() => {
  nav.pathname = '/contribute';
  nav.search = '';
});

describe("the gate's tabs", () => {
  it.each([
    ['signed out', { kind: 'signed-out' } as WorkspaceGate, []],
    ['signed in, the workspace hidden', { kind: 'hidden' } as WorkspaceGate, []],
    ['setting up', { kind: 'setting-up' } as WorkspaceGate, []],
    ['open, not entered', open({ entered: false }), []],
    ['open, entered, Learn not open', open({ learnOpen: false }), NO_LEARN],
    ['open, entered, Learn open', open(), ALL],
    // Everything revoked: the tabs stay, and the pages say what to do.
    ['entered with nothing connected now', open({ agents: { hosted: false, own: false } }), ALL],
  ])('%s: %j', (_who, viewer, tabs) => {
    expect(tabsOf(viewer)).toEqual(tabs);
  });

  it('reads the gate, then the work, the count and the version, for the tabs it gives', async () => {
    gate.loadWorkspaceGate.mockResolvedValueOnce(open());
    const html = renderToStaticMarkup(await WorkspaceTabs());
    expect(tabLinks(html)).toHaveLength(5);
    expect(text(html)).toContain('Pull requests 3 need you');

    gate.loadWorkspaceGate.mockResolvedValueOnce(open({ learnOpen: false }));
    expect(tabLinks(renderToStaticMarkup(await WorkspaceTabs()))).toHaveLength(4);
  });

  it('shows no tabs, and reads nothing more, without them; nor when the gate could not be read', async () => {
    data.loadNeedsYouCount.mockClear();
    const line = renderToStaticMarkup(<HeaderLine />);
    for (const viewer of [{ kind: 'signed-out' }, { kind: 'hidden' }, open({ entered: false })]) {
      gate.loadWorkspaceGate.mockResolvedValueOnce(viewer);
      expect(renderToStaticMarkup(await WorkspaceTabs())).toBe(line);
    }
    gate.loadWorkspaceGate.mockRejectedValueOnce(new Error('GitRanks Contribute did not load'));
    expect(renderToStaticMarkup(await WorkspaceTabs())).toBe(line);
    expect(data.loadNeedsYouCount).not.toHaveBeenCalled();
  });
});

describe('the tab bar', () => {
  it("is the site's tabs, in order, each to its page and marked as the workspace's own", () => {
    const html = tabsAt('/contribute');
    expect(tabLinks(html).map((link) => link.match(/href="([^"]+)"/)?.[1])).toEqual([
      '/contribute',
      '/learn',
      '/my/pull-requests',
      '/my/agent',
      '/my/settings',
    ]);
    expect(text(html)).toBe('Contribute Learn Pull requests Agent Settings');
    for (const link of tabLinks(html)) expect(link).toContain('data-contribute-source="workspace_tab"');
    // The tabs' own line is the one under the header: no second one.
    expect(html.match(/\bborder-b(?![\w-])/g)).toHaveLength(1);
  });

  it.each([
    ['/contribute', '', 'contribute'],
    ['/contribute/', '', 'contribute'],
    ['/my/start/acme/widgets/42', '', 'contribute'],
    ['/my/start/acme/widgets/42', 'lesson=1', 'learn'],
    ['/learn', '', 'learn'],
    ['/learn/lessons', '', 'learn'],
    ['/learn/profile', '', 'learn'],
    ['/learn/start/acme/widgets/42', '', 'learn'],
    ['/my/progress', '', 'learn'],
    ['/my/pull-requests', '', 'pull-requests'],
    ['/my/pull-requests/by-attempt/A_1', '', 'pull-requests'],
    ['/my/pull-requests/acme/widgets/42/runs/R_1', '', 'pull-requests'],
    ['/my/pull-requests/acme/widgets/42', '', 'pull-requests'],
    ['/my/pull-requests/acme/widgets/42/runs/R_1', '', 'pull-requests'],
    ['/my/pull-requests/acme/widgets/42/earlier/A_0', '', 'pull-requests'],
    ['/my/pull-requests/acme/widgets/42/lesson', '', 'pull-requests'],
    ['/my/agent', '', 'agent'],
    ['/my/agent/connect', '', 'agent'],
    ['/my/agent/key', '', 'agent'],
    ['/my/agent/model', '', 'agent'],
    ['/my/agent/budget', '', 'agent'],
    ['/my/agent/runs', 'outcome=no_go', 'agent'],
    ['/my/settings', '', 'settings'],
    ['/my/settings/work', '', 'settings'],
    ['/my/settings/work/switch/stack', '', 'settings'],
  ])('marks the tab of %s?%s: %s', (pathname, search, tab) => {
    expect(activeTabOf(pathname, new URLSearchParams(search))).toBe(tab);
    expect(currentTab(tabsAt(pathname, search))).toEqual([tab]);
  });

  it('marks no tab on a page of no tab', () => {
    expect(activeTabOf('/my/agentx', new URLSearchParams())).toBeNull();
    expect(currentTab(tabsAt('/my/elsewhere'))).toEqual([]);
  });

  it('draws only the line under the header where there are no tabs', () => {
    const line = renderToStaticMarkup(<HeaderLine />);
    expect(tabsAt('/contribute', '', { tabs: [] })).toBe(line);
    expect(tabsAt('/contribute', 'as=visitor')).toBe(line);
    for (const path of ['/contribute/maintainers', '/contribute/mcp', '/learn/about', '/learn/lessons/a-lesson-1x']) {
      expect(tabsAt(path), path).toBe(line);
    }
    // Only on the landing does the visitor's view hide them.
    expect(workspaceTabsShown('/my/settings', 'visitor', ALL)).toBe(true);
    expect(line).toBe('<div class="border-b"></div>');
  });

  it("counts what needs the user on Pull requests, in the brand's pill, and nothing at zero or unknown", () => {
    const html = tabsAt('/my/agent', '', { needsYou: 4 });
    const pr = html.match(/<a [^>]*data-workspace-tab="pull-requests"[\s\S]*?<\/a>/)?.[0] ?? '';
    expect(pr).toContain('data-tab-count="brand"');
    expect(pr).toContain('bg-brand-soft');
    expect(text(pr)).toBe('Pull requests 4 need you');
    for (const needsYou of [0, null]) {
      expect(tabsAt('/my/agent', '', { needsYou })).not.toContain('data-tab-count');
    }
  });

  it('spins and counts on Agent while agents work, and shows the label alone otherwise', () => {
    const working = tabsAt('/my/settings', '', { activity: activityOf(WORKING, FOLLOW_UP, QUEUED, READY) });
    const agent = working.match(/<a [^>]*data-workspace-tab="agent"[\s\S]*?<\/a>/)?.[0] ?? '';
    expect(agent).toContain('data-agent-runs="working"');
    expect(agent).toContain('motion-safe:animate-spin');
    expect(text(agent)).toBe('Agent 2 2 at work');
    for (const activity of [activityOf(QUEUED), activityOf(READY), activityOf(), null]) {
      const html = tabsAt('/my/settings', '', { activity });
      const quiet = html.match(/<a [^>]*data-workspace-tab="agent"[\s\S]*?<\/a>/)?.[0] ?? '';
      expect(text(quiet)).toBe('Agent');
      expect(quiet).not.toContain('animate-');
    }
  });
});

describe("the workspace's layout", () => {
  it("is the site's header with no section marked, then the line while the viewer is read", () => {
    const html = renderToStaticMarkup(<WorkspaceLayout>{null}</WorkspaceLayout>);
    const header = html.match(/<header[\s\S]*<\/header>/)?.[0] ?? '';

    expect(header).toContain('<a class="shrink-0" href="/">');
    expect(header).toContain('<nav aria-label="Main"');
    expect(header).toContain('data-avatar-menu');
    expect(header).not.toContain('>/</span>');
    expect(html.slice(html.indexOf('</header>'))).toContain('<div class="border-b"></div>');
    expect(html).not.toContain('data-workspace-tab');
  });
});

describe("the workspace's metadata", () => {
  it('sets no robots on the group, so /learn stays indexable once Learn is open to everyone', async () => {
    const group = await import('@/app/(workspace)/layout');
    const learn = await import('@/app/(workspace)/learn/layout');
    expect('metadata' in group).toBe(false);
    expect(learn.metadata).toEqual({ title: 'Learn' });
  });

  it("keeps Contribute's pages and every page under /my out of the index", async () => {
    const contribute = await import('@/app/(workspace)/contribute/layout');
    const my = await import('@/app/(workspace)/my/layout');
    expect(contribute.metadata.robots).toEqual({ index: false, follow: false });
    expect(my.metadata.robots).toEqual({ index: false, follow: false });
  });
});
