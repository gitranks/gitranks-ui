import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/learn/start',
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
vi.mock('@/lib/learn/actions', () => ({
  saveLearnProfile: vi.fn(),
  readLearnIssues: vi.fn(),
  readPracticeLessons: vi.fn(),
}));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/workspace/issue-actions', () => ({ startIssue: vi.fn(), skipIssue: vi.fn() }));
vi.mock('@/lib/workspace/start/start-page.actions', () => ({ readStartPageAttempt: vi.fn() }));
const flow = vi.hoisted(() => ({
  loadLearnFlowPlace: vi.fn(),
  readLearnPublicIssues: vi.fn(),
  readLearnPublicPractice: vi.fn(),
}));
vi.mock('@/lib/learn/start-flow.data', () => flow);
const data = vi.hoisted(() => ({ loadLearnIssues: vi.fn(), loadPracticeLessons: vi.fn() }));
vi.mock('@/lib/learn/learn.data', () => data);
const workspace = vi.hoisted(() => ({
  loadContribute: vi.fn(async (): Promise<unknown> => null),
  viewerLogin: vi.fn(async () => 'octocat'),
}));
vi.mock('@/lib/workspace/contribute.data', () => workspace);

const { default: GoalPage } = await import('./page');
const { default: IssuesPage } = await import('./issues/page');
const { ApplyLearnGoal } = await import('./components/apply-goal');
const { ISSUES, PRACTICE, emptyIssues, learnIssues, practiceLessons } = await import('@/lib/learn/__fixtures__/home');
const { emptyProfile, filledProfile } = await import('@/lib/learn/__fixtures__/profile');
const { elementsOf, resolved, text } = await import('./__fixtures__/render');

async function render(page: (props: never) => ReactElement, search: Record<string, string> = {}): Promise<string> {
  return renderToStaticMarkup(await resolved(page({ searchParams: Promise.resolve(search) } as never)));
}

const SIGNED_OUT = { kind: 'signed-out' } as const;
const OPEN = { kind: 'open', entered: false, agents: { hosted: false, own: false }, learnOpen: true } as const;
const at = (place: object, gate: object = OPEN, profile: unknown = null) =>
  flow.loadLearnFlowPlace.mockResolvedValue({ place, gate, profile });
const PAGE = { kind: 'page' };
const GOAL = { language: 'TypeScript', level: '1' };
/** What a visitor's list holds: rows without their node id. */
const PUBLIC_ITEMS = ISSUES.slice(0, 2).map(({ issueId: _id, ...issue }) => issue);
/** 15 public practice lessons of 20 for the language, as the kept answer holds them. */
const PUBLIC_PRACTICE = {
  items: Array.from({ length: 15 }, (_, index) => ({
    ...PRACTICE[index % PRACTICE.length],
    slug: `practice-${index}`,
  })),
  total: 20,
};

beforeEach(() => {
  vi.clearAllMocks();
  flow.readLearnPublicIssues.mockResolvedValue({
    ok: true,
    data: { language: 'TypeScript', items: PUBLIC_ITEMS, total: 38 },
  });
  flow.readLearnPublicPractice.mockResolvedValue({ ok: true, data: PUBLIC_PRACTICE });
  data.loadLearnIssues.mockResolvedValue(learnIssues());
  data.loadPracticeLessons.mockResolvedValue(practiceLessons());
});

describe('Your goal', () => {
  it('a visitor: no language picked, the level New to it, nothing saved, no More choices', async () => {
    at(PAGE, SIGNED_OUT);
    const html = await render(GoalPage);
    expect(html).toContain('aria-current="step"');
    expect(html).toMatch(/<h1[^>]*>What do you want to learn\?<\/h1>/);
    expect(text(html)).toContain('You can change it later.');
    expect(text(html)).toContain('Nothing is saved yet. You sign in when you start an issue.');
    expect(text(html)).not.toContain('More choices');
    expect(html).toMatch(/data-level="0"[^>]*>\s*<input[^>]*checked/);
    expect(html).toContain('data-contribute-source="learn_flow_goal"');
    expect(text(html)).toContain('Show issues');
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled/);
  });

  it('back from Change: the goal in the address is pre-set', async () => {
    at(PAGE, SIGNED_OUT);
    const html = await render(GoalPage, { language: 'go', level: '2' });
    expect(text(html)).toContain('Show issues for Go');
    expect(html).toMatch(/data-level="2"[^>]*>\s*<input[^>]*checked/);
    expect(flow.loadLearnFlowPlace).toHaveBeenCalledWith('goal', { goalInAddress: true });
  });

  it('signed in: the saved goal pre-set, More choices to Settings, no visitor line', async () => {
    at(PAGE, OPEN, filledProfile);
    const html = await render(GoalPage);
    expect(text(html)).toContain('Show issues for TypeScript');
    expect(html).toContain('href="/my/settings/goal"');
    expect(text(html)).not.toContain('Nothing is saved yet');
  });

  it('an account being set up waits in the frame; an entered one goes to the Learn tab; a closed Learn is a 404', async () => {
    at({ kind: 'setting-up' }, { kind: 'setting-up' });
    const html = text(await render(GoalPage));
    expect(html).toContain('GitRanks Learn');
    expect(html).toContain('Setting up your GitRanks account');
    at({ kind: 'redirect', to: '/learn' }, { ...OPEN, entered: true });
    await expect(render(GoalPage)).rejects.toThrow('NEXT_REDIRECT /learn');
    at({ kind: 'not-found' }, SIGNED_OUT);
    await expect(render(GoalPage)).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

describe('Pick an issue: a visitor', () => {
  it("shows the day's short list for the address's goal, each Start a lesson to the issue's step with the goal", async () => {
    at(PAGE, SIGNED_OUT);
    const html = await render(IssuesPage, GOAL);
    const words = text(html);
    expect(words).toContain('Pick an issue for your lesson');
    expect(words).toContain(
      'Open TypeScript issues from projects that take outside pull requests. Your lesson is written for the issue you pick.',
    );
    expect(words).toContain('For your goal: TypeScript Some Change');
    expect(html).toContain('href="/learn/start?language=TypeScript&amp;level=1"');
    expect(words).toContain('Starting asks you to sign in with GitHub.');
    expect(html).toContain('href="/learn/start/driftwood-js/driftwood/934?language=TypeScript&amp;level=1"');
    expect(html).toContain('href="/learn/start/tidewave/tide/958?language=TypeScript&amp;level=1"');
    expect(html).not.toContain('/my/start');
    expect(html).toContain('data-contribute-source="learn_flow_issue"');
    expect(words).toContain('Showing 2 of about 38 issues');
    const list = html.slice(html.indexOf('data-learn-flow-issues="visitor"'), html.indexOf('id="practice"'));
    expect(text(list)).not.toContain('Show 10 more');
    expect(words).toContain('Sign in with GitHub to see all');
    expect(html).toContain('data-contribute-source="learn_flow_more"');
    expect(flow.readLearnPublicIssues).toHaveBeenCalledWith('TypeScript');
    expect(data.loadLearnIssues).not.toHaveBeenCalled();
  });

  it('shows 3 public practice lessons, then Show 10 more in place, counted for the language alone', async () => {
    at(PAGE, SIGNED_OUT);
    const html = await render(IssuesPage, GOAL);
    expect(text(html)).toContain('Practice first? Optional');
    expect(html.match(/data-practice-lesson=/g)).toHaveLength(3);
    expect(text(html)).toContain('20 for TypeScript');
    expect(text(html)).not.toContain('you haven’t passed');
    expect(text(html)).toContain('Showing 3 of 15 practice lessons Show 10 more');
    expect(html).toContain('data-contribute-source="learn_flow_practice"');
    expect(data.loadPracticeLessons).not.toHaveBeenCalled();
  });

  it('none ready today, and a list that could not be read, each say so with one next step', async () => {
    at(PAGE, SIGNED_OUT);
    flow.readLearnPublicIssues.mockResolvedValueOnce({ ok: true, data: null });
    let html = await render(IssuesPage, GOAL);
    expect(text(html)).toContain('No open TypeScript issues are ready today. New ones come in every day.');
    expect(html).toContain('href="/learn/start?language=TypeScript&amp;level=1"');
    expect(text(html)).not.toContain('Starting asks you to sign in');
    flow.readLearnPublicIssues.mockResolvedValueOnce({ ok: false });
    html = await render(IssuesPage, GOAL);
    expect(text(html)).toContain('Couldn’t load the issues. Try again in a minute.');
  });

  it('with no practice lesson for the goal, the practice section is left out', async () => {
    at(PAGE, SIGNED_OUT);
    flow.readLearnPublicPractice.mockResolvedValueOnce({ ok: true, data: { items: [], total: 0 } });
    expect(text(await render(IssuesPage, GOAL))).not.toContain('Practice first?');
  });
});

describe('Pick an issue: signed in', () => {
  it('a saved goal: their own list, each Start a lesson to the issue’s step without the goal, Change to step 1', async () => {
    at(PAGE, OPEN, filledProfile);
    const html = await render(IssuesPage);
    const words = text(html);
    expect(words).toContain('For your goal: TypeScript Some Change');
    expect(html).toContain('href="/learn/start/driftwood-js/driftwood/934"');
    expect(html).not.toContain('/my/start');
    expect(html).toContain('href="/learn/start"');
    expect(html.match(/data-issue=/g)).toHaveLength(ISSUES.length);
    expect(words).not.toContain('Starting asks you to sign in');
    expect(words).not.toContain('Sign in with GitHub to see all');
    expect(words).toContain('7 for TypeScript you haven’t passed');
    expect(flow.readLearnPublicIssues).not.toHaveBeenCalled();
  });

  it('back from the sign-in with another goal saved: the saved goal’s list and chips, and nothing is written', async () => {
    at(PAGE, OPEN, filledProfile);
    const tree = await resolved(IssuesPage({ searchParams: Promise.resolve({ language: 'Go', level: '2' }) } as never));
    const html = renderToStaticMarkup(tree);
    expect(text(html)).toContain('For your goal: TypeScript Some Change');
    expect(text(html)).not.toContain('Saving your goal…');
    expect(text(html)).not.toContain('For your goal: Go');
    expect(data.loadLearnIssues).toHaveBeenCalled();
    expect(html.match(/data-issue=/g)).toHaveLength(ISSUES.length);
    // The address's goal only leaves the address: the apply step is told the account has its own.
    const applies = elementsOf(tree, ApplyLearnGoal);
    expect(applies).toHaveLength(1);
    expect(applies[0].props).toMatchObject({ saved: true, goal: { language: 'Go', level: 2 } });
  });

  it("the list's notes send Change your goal to step 1", async () => {
    at(PAGE, OPEN, filledProfile);
    data.loadLearnIssues.mockResolvedValueOnce(emptyIssues.noneToday);
    const html = await render(IssuesPage);
    expect(text(html)).toContain('No open issues fit TypeScript today.');
    expect(html).toMatch(/href="\/learn\/start"[^>]*>Change your goal/);
  });

  it('back from the sign-in with a goal in the address and none saved: "Saving your goal…" in the list’s place', async () => {
    at(PAGE, OPEN, emptyProfile);
    const html = await render(IssuesPage, GOAL);
    expect(text(html)).toContain('Saving your goal…');
    expect(text(html)).toContain('For your goal: TypeScript Some Change');
    expect(data.loadLearnIssues).not.toHaveBeenCalled();
    expect(data.loadPracticeLessons).not.toHaveBeenCalled();
  });

  it('an entered account with the goal only in the address saves it there, then moves on', async () => {
    at({ kind: 'apply-then', to: '/learn' }, { ...OPEN, entered: true }, null);
    const html = await render(IssuesPage, GOAL);
    expect(text(html)).toContain('Saving your goal…');
    expect(data.loadLearnIssues).not.toHaveBeenCalled();
  });

  it('every other case is a server redirect: no goal anywhere, or an entered account', async () => {
    at({ kind: 'redirect', to: '/learn/start' }, OPEN, emptyProfile);
    await expect(render(IssuesPage)).rejects.toThrow('NEXT_REDIRECT /learn/start');
    at({ kind: 'redirect', to: '/learn' }, { ...OPEN, entered: true }, filledProfile);
    await expect(render(IssuesPage)).rejects.toThrow('NEXT_REDIRECT /learn');
  });
});
