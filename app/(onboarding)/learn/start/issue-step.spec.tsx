import type { ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/learn/start/driftwood-js/driftwood/934',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
vi.mock('server-only', () => ({}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn(), useSession: () => ({ data: null }) }));
vi.mock('@/lib/learn/actions', () => ({ saveLearnProfile: vi.fn() }));
vi.mock('@/lib/workspace/start/start-page.actions', () => ({
  readStartPageAttempt: vi.fn(),
  readStartPageIssue: vi.fn(),
}));
const flow = vi.hoisted(() => ({
  loadLearnFlowPlace: vi.fn(),
  readLearnPublicIssues: vi.fn(),
  readLearnPublicPractice: vi.fn(),
}));
vi.mock('@/lib/learn/start-flow.data', () => flow);
const workspace = vi.hoisted(() => ({ viewerLogin: vi.fn(async () => 'octocat') }));
vi.mock('@/lib/workspace/contribute.data', () => workspace);
const start = vi.hoisted(() => ({ loadStartPageView: vi.fn() }));
vi.mock('@/lib/workspace/start/start-page.data', () => start);
// The poll outside the tabs: a mark, so the page says where it mounts it.
vi.mock('@/components/workspace/workspace-live', () => ({
  WorkspaceLive: ({ children }: { children: ReactNode }) => <div data-workspace-live="">{children}</div>,
}));

const { default: IssueStepPage } = await import('./[owner]/[repo]/[issue]/page');
const { ApplyLearnGoal } = await import('./components/apply-goal');
const { ISSUES } = await import('@/lib/learn/__fixtures__/home');
const { emptyProfile, filledProfile } = await import('@/lib/learn/__fixtures__/profile');
const { startPageViewOf } = await import('@/lib/workspace/start/__fixtures__/start-page');
const { elementsOf, resolved, text } = await import('./__fixtures__/render');

const ROUTE = { owner: 'driftwood-js', repo: 'driftwood', issue: '934' };
const REF = { repo: 'driftwood-js/driftwood', issue: 934 };
const GOAL = { language: 'TypeScript', level: '1' };

const treeOf = (search: Record<string, string> = {}, route: Record<string, string> = ROUTE) =>
  resolved(IssueStepPage({ params: Promise.resolve(route), searchParams: Promise.resolve(search) } as never));
const render = async (search?: Record<string, string>, route?: Record<string, string>) =>
  renderToStaticMarkup((await treeOf(search, route)) as ReactElement);

const SIGNED_OUT = { kind: 'signed-out' } as const;
const OPEN = { kind: 'open', entered: false, agents: { hosted: false, own: false } } as const;
const PAGE = { kind: 'page' };
const at = (place: object, gate: object = OPEN, profile: unknown = null) =>
  flow.loadLearnFlowPlace.mockResolvedValue({ place, gate, profile });
const PUBLIC_ITEMS = ISSUES.slice(0, 2).map(({ issueId: _id, ...issue }) => issue);

beforeEach(() => {
  vi.clearAllMocks();
  flow.readLearnPublicIssues.mockResolvedValue({
    ok: true,
    data: { language: 'TypeScript', items: PUBLIC_ITEMS, total: 38 },
  });
  start.loadStartPageView.mockImplementation(async (_ref, _mode, goal) => ({
    kind: 'view',
    view: startPageViewOf({ goal }),
  }));
});

describe('Your agent: the address', () => {
  it('a bad owner, repo or number is a 404 for everyone, before anything is read', async () => {
    for (const route of [
      { ...ROUTE, owner: '-acme' },
      { ...ROUTE, repo: '..' },
      { ...ROUTE, issue: 'x' },
      { ...ROUTE, issue: '0' },
    ]) {
      await expect(render({}, route), JSON.stringify(route)).rejects.toThrow('NEXT_NOT_FOUND');
    }
    expect(flow.loadLearnFlowPlace).not.toHaveBeenCalled();
  });
});

describe('Your agent: a visitor', () => {
  it('an issue on the day’s list: its repo and title, the goal, Sign in with GitHub first, the rest dimmed', async () => {
    at(PAGE, SIGNED_OUT);
    const html = await render(GOAL);
    const words = text(html);
    expect(html).toContain('aria-current="step"');
    expect(flow.loadLearnFlowPlace).toHaveBeenCalledWith('issue', { goalInAddress: true, issue: REF });
    expect(html).toContain('href="/learn/start/issues?language=TypeScript&amp;level=1"');
    expect(words).toContain('Issues for your goal');
    expect(words).toContain('Fix this issue and learn from it');
    expect(words).toContain('driftwood-js/driftwood');
    expect(words).toContain(ISSUES[0].title);
    expect(words).toContain('Your lesson will be written for: TypeScript, Some');
    expect(words).toContain('1 · Sign in with GitHub');
    expect(words).toContain(
      'The lesson and the pull request will be in your name. Your goal comes with you: TypeScript, Some.',
    );
    expect(html).toContain('data-contribute-source="learn_flow_sign_in"');
    expect(html).toContain('data-start-locked');
    expect(words).toContain('2 · Connect your agent');
    expect(words).toContain('3 · Paste one prompt in your agent');
    expect(words).not.toContain('Claude key');
    expect(start.loadStartPageView).not.toHaveBeenCalled();
  });

  it('an issue not on that list (or no goal): "The issue you picked", no repo name and no title', async () => {
    at(PAGE, SIGNED_OUT);
    const words = text(await render(GOAL, { owner: 'someone', repo: 'elsewhere', issue: '7' }));
    expect(words).toContain('The issue you picked');
    expect(words).toContain('Issue #7');
    expect(words).not.toContain('someone/elsewhere');
    expect(words).toContain('Your lesson will be written for: TypeScript, Some');

    const bareHtml = await render({}, { owner: 'someone', repo: 'elsewhere', issue: '7' });
    const bare = text(bareHtml);
    expect(bare).toContain('The issue you picked');
    expect(bare).toContain('The lesson and the pull request will be in your name.');
    expect(bare).not.toContain('Your goal comes with you');
    // No goal: the card leads to Your goal, never to a lesson "for a general reader" or to Settings.
    expect(bare).toContain('Your lesson is written for your goal. Pick your goal');
    expect(bareHtml).toMatch(/href="\/learn\/start"[^>]*>Pick your goal/);
    expect(bare).not.toContain('general reader');
    expect(bareHtml).not.toContain('/my/settings/goal');
  });

  it('a list that could not be read shows the issue by its number alone', async () => {
    at(PAGE, SIGNED_OUT);
    flow.readLearnPublicIssues.mockResolvedValueOnce({ ok: false });
    const words = text(await render(GOAL));
    expect(words).toContain('The issue you picked');
    expect(words).not.toContain(ISSUES[0].title);
  });
});

describe('Your agent: signed in', () => {
  it('no goal saved, the goal in the address: saved first, nothing about the issue read for them before', async () => {
    at(PAGE, OPEN, emptyProfile);
    const tree = await treeOf(GOAL);
    const html = renderToStaticMarkup(tree as ReactElement);
    expect(text(html)).toContain('Saving your goal…');
    expect(html).toContain('data-start-locked');
    expect(start.loadStartPageView).not.toHaveBeenCalled();
    expect(elementsOf(tree, ApplyLearnGoal)[0].props).toMatchObject({ saved: false, moveTo: undefined });
  });

  it('a goal saved: the Start page read for them in lesson mode, section 1 collapsed, the poll mounted', async () => {
    at(PAGE, OPEN, filledProfile);
    const html = await render();
    const words = text(html);
    expect(start.loadStartPageView).toHaveBeenCalledWith(REF, 'lesson', 'TypeScript, Some');
    expect(words).toContain('Signed in as @octocat.');
    expect(words).toContain('Your lesson will be written for: TypeScript, Some');
    expect(html).toContain('data-start-mode="lesson"');
    expect(html).toContain('data-workspace-live');
    expect(html).not.toContain('data-start-locked');
    expect(html).not.toContain('data-flow-sign-in');
    expect(words).toContain('2 · Connect your agent');
    expect(html).toContain('href="/learn/start/issues"');
  });

  it('a different goal saved than the address’s: nothing written, the card names the saved one with Change', async () => {
    at(PAGE, OPEN, filledProfile);
    const tree = await treeOf({ language: 'Go', level: '2' });
    const html = renderToStaticMarkup(tree as ReactElement);
    expect(text(html)).toContain('Your lesson will be written for your saved goal: TypeScript, Some. Change');
    expect(html).toMatch(/href="\/learn\/start"[^>]*>Change/);
    expect(elementsOf(tree, ApplyLearnGoal)[0].props).toMatchObject({ saved: true });
  });

  it("moves on to the viewer's own attempt, and is a 404 where the API has no page", async () => {
    at(PAGE, OPEN, filledProfile);
    start.loadStartPageView.mockResolvedValueOnce({ kind: 'claimed', href: '/my/pull-requests/by-attempt/A_7' });
    await expect(render()).rejects.toThrow('NEXT_REDIRECT /my/pull-requests/by-attempt/A_7');
    start.loadStartPageView.mockResolvedValueOnce({ kind: 'not-found' });
    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('an entered account goes on to the Start page; with the goal only in the address, it is saved first', async () => {
    const entered = { ...OPEN, entered: true };
    at({ kind: 'redirect', to: '/my/start/driftwood-js/driftwood/934?lesson=1' }, entered, filledProfile);
    await expect(render()).rejects.toThrow('NEXT_REDIRECT /my/start/driftwood-js/driftwood/934?lesson=1');
    at({ kind: 'apply-then', to: '/my/start/driftwood-js/driftwood/934?lesson=1' }, entered, null);
    const tree = await treeOf(GOAL);
    expect(text(renderToStaticMarkup(tree as ReactElement))).toContain('Saving your goal…');
    expect(elementsOf(tree, ApplyLearnGoal)[0].props).toMatchObject({
      saved: false,
      moveTo: '/my/start/driftwood-js/driftwood/934?lesson=1',
    });
    expect(start.loadStartPageView).not.toHaveBeenCalled();
  });

  it('a 404, or an account being set up, is decided before the page: the 404, or the panel', async () => {
    at({ kind: 'not-found' }, { kind: 'hidden' });
    await expect(render()).rejects.toThrow('NEXT_NOT_FOUND');
    at({ kind: 'setting-up' }, { kind: 'setting-up' });
    expect(text(await render(GOAL))).toContain('Setting up your GitRanks account');
  });
});
