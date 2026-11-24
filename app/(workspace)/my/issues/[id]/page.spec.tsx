import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/my/issues/q7k2m9xa',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/workspace/masked-issue.actions', () => ({}));
vi.mock('@/lib/workspace/fair-use.actions', () => ({}));
vi.mock('@/components/workspace/agent/agent-connect', () => ({
  AgentConnect: () => <div data-agent-connect="" />,
}));
const gate = vi.hoisted(() => ({ loadWorkspaceGate: vi.fn() }));
vi.mock('@/lib/workspace/gate.data', () => gate);
const data = vi.hoisted(() => ({
  loadIssuePage: vi.fn(),
  loadIssueNumbers: vi.fn(),
  loadIssueStartReads: vi.fn(),
}));
vi.mock('@/lib/workspace/masked-issue.data', () => data);
const learnParts = vi.hoisted(() => ({ loadIssuePageLearn: vi.fn() }));
vi.mock('@/lib/workspace/issue-page-learn.data', () => learnParts);
const learn = vi.hoisted(() => ({ loadLearnProfile: vi.fn() }));
vi.mock('@/lib/learn/learn.data', () => learn);

const { default: MaskedIssuePage } = await import('./page');
const { emptyProfile, filledProfile } = await import('@/lib/learn/__fixtures__/profile');
const { fullPage, issueNumbers, issuePage, looksAtLimit, MASKED_NOW } = await import(
  '@/lib/workspace/__fixtures__/masked-issue'
);

const OPEN = { kind: 'open', entered: true, agents: { hosted: false, own: true } } as const;
const START = {
  connection: { client: 'claude-code', lastCallAt: '2026-10-28T11:00:00.000Z' },
  agent: { onboarded: true, tokens: [], signIn: true },
  waitingPrs: null,
};

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replace(/\s+/g, ' ')
    .trim();

/** The page's inner part, as its Suspense boundary renders it. */
async function renderInner(page: ReactElement): Promise<string> {
  const main = page.props as { children: ReactElement };
  const suspense = main.children as ReactElement<{ children: ReactElement }>;
  const inner = suspense.props.children as ReactElement<Record<string, unknown>>;
  const render = inner.type as (props: Record<string, unknown>) => Promise<ReactElement>;
  return renderToStaticMarkup(await render(inner.props));
}

const issuePageAt = (search: Record<string, string> = {}, id = 'q7k2m9xa') =>
  renderInner(
    MaskedIssuePage({
      params: Promise.resolve({ id }),
      searchParams: Promise.resolve(search),
    } as never) as ReactElement,
  );
const stateOf = (html: string) => /data-issue-page="(\w+)"/.exec(html)?.[1];

beforeEach(() => {
  vi.clearAllMocks();
  // The fixtures' clock: the hold ends 14 minutes after it.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(MASKED_NOW);
  gate.loadWorkspaceGate.mockResolvedValue(OPEN);
  data.loadIssuePage.mockResolvedValue({ kind: 'page', page: issuePage() });
  data.loadIssueNumbers.mockResolvedValue(issueNumbers);
  data.loadIssueStartReads.mockResolvedValue(START);
  learn.loadLearnProfile.mockResolvedValue(null);
  learnParts.loadIssuePageLearn.mockResolvedValue(null);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the page of one issue at /my/issues/[id]', () => {
  it('reads the page by the mask id in the address, which names no project', async () => {
    const html = await issuePageAt();
    expect(data.loadIssuePage).toHaveBeenCalledWith('q7k2m9xa');
    expect(stateOf(html)).toBe('MASKED');
    expect(text(html)).toContain('See the full issue');
    expect(text(html)).not.toMatch(/acme|#1290/);
  });

  it.each([
    ['MASKED', issuePage(), 'Tags show twice in a sidebar after one of them is renamed'],
    ['FULL', fullPage(), 'Duplicate tags appear in the sidebar after a rename'],
    [
      'STARTED',
      issuePage({ state: 'STARTED', startPath: '/my/pull-requests/acme/notebook/1290' }),
      'You started this issue',
    ],
    ['GIVEN_BACK', issuePage({ state: 'GIVEN_BACK', reasons: ['FIXED'] }), 'You gave this issue back'],
    ['EXPIRED', issuePage({ state: 'EXPIRED' }), 'The 15 minutes are over'],
    ['REPLACED', issuePage({ state: 'REPLACED' }), 'You gave this issue back when you saw another'],
    ['TAKEN', issuePage({ state: 'TAKEN' }), 'Someone else is looking at this issue'],
    ['LIMIT', issuePage({ state: 'LIMIT', looks: looksAtLimit }), 'You have seen 10 full issues today'],
    ['LEFT_POOL', issuePage({ state: 'LEFT_POOL' }), 'This issue is no longer open for a fix'],
    ['NOT_AVAILABLE', issuePage({ state: 'NOT_AVAILABLE' }), 'This issue is not on your list'],
  ] as const)('%s: shows its state from the fixture', async (state, page, heading) => {
    data.loadIssuePage.mockResolvedValue({ kind: 'page', page });
    const html = await issuePageAt();
    expect(stateOf(html)).toBe(state);
    expect(/<h1[^>]*>([^<]*)<\/h1>/.exec(html)?.[1]).toBe(heading.replaceAll("'", '&#x27;'));
    expect(text(html)).not.toMatch(/—/);
  });

  it('shows the issue in full with the agent that called, and the hold with its end', async () => {
    data.loadIssuePage.mockResolvedValue({ kind: 'page', page: fullPage() });
    const html = text(await issuePageAt());
    expect(html).toContain('Claude Code is connected');
    expect(html).toContain('Held for you');
    expect(html).toContain('Not for me');
  });

  it("leads back to the list the person came from: Learn's Issues page with its filters, or Contribute's", async () => {
    const learnBack = await issuePageAt({ from: 'learn' });
    expect(learnBack).toContain('href="/learn/issues"');
    expect(learnBack).not.toContain('/learn/earlier');
    const filtered = await issuePageAt({ from: 'learn', lesson: 'a-queue', 'for-you': '0', next: '//evil.example' });
    expect(filtered).toContain('href="/learn/issues?lesson=a-queue&amp;for-you=0"');
    expect(filtered).not.toContain('evil.example');
    const lessonView = await issuePageAt({ from: 'learn', lesson: 'a-queue', at: 'lesson' });
    expect(lessonView).toContain('href="/learn/lessons/a-queue/real-world"');
    learn.loadLearnProfile.mockResolvedValue(filledProfile);
    expect(await issuePageAt({ from: 'contribute' })).toContain('href="/contribute#issues"');
    expect(await issuePageAt({ from: 'contribute' })).not.toContain('href="/learn/issues');
  });

  it("leads back, when the address names no side, to Learn's Issues for a person who uses Learn, else Contribute's", async () => {
    // What the API answers a signed-in person with no Learn profile: an empty one, nothing saved.
    learn.loadLearnProfile.mockResolvedValue(emptyProfile);
    expect(await issuePageAt()).toContain('href="/contribute#issues"');
    expect(await issuePageAt({ from: 'elsewhere' })).toContain('href="/contribute#issues"');
    learn.loadLearnProfile.mockResolvedValue(null);
    expect(await issuePageAt()).toContain('href="/contribute#issues"');
    learn.loadLearnProfile.mockResolvedValue(filledProfile);
    const learner = await issuePageAt();
    expect(learner).toContain('href="/learn/issues"');
    expect(learner).not.toContain('href="/contribute#issues"');
    // A Learn read that fails knows no Learn: Contribute's.
    learn.loadLearnProfile.mockRejectedValue(new Error('down'));
    expect(await issuePageAt()).toContain('href="/contribute#issues"');
  });

  it.each([
    ['GIVEN_BACK', issuePage({ state: 'GIVEN_BACK' })],
    ['EXPIRED', issuePage({ state: 'EXPIRED' })],
    ['REPLACED', issuePage({ state: 'REPLACED' })],
    ['TAKEN', issuePage({ state: 'TAKEN' })],
    ['LIMIT', issuePage({ state: 'LIMIT', looks: looksAtLimit })],
    ['LEFT_POOL', issuePage({ state: 'LEFT_POOL' })],
    ['NOT_AVAILABLE', issuePage({ state: 'NOT_AVAILABLE' })],
    ['STARTED', issuePage({ state: 'STARTED', startPath: null })],
  ] as const)('%s: "Back to Issues" leads to the list the person came from', async (_state, page) => {
    data.loadIssuePage.mockResolvedValue({ kind: 'page', page });
    const learnEnd = await issuePageAt({ from: 'learn', course: 'data-structures' });
    expect(/href="([^"]*)"[^>]*>Back to Issues/.exec(learnEnd)?.[1]).toBe('/learn/issues?course=data-structures');
    const contributeEnd = await issuePageAt({ from: 'contribute' });
    expect(/href="([^"]*)"[^>]*>Back to Issues/.exec(contributeEnd)?.[1]).toBe('/contribute#issues');
  });

  it('is not found for an address that names no issue, and a viewer it is not open to', async () => {
    await expect(issuePageAt({}, '../x')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(data.loadIssuePage).not.toHaveBeenCalled();
    gate.loadWorkspaceGate.mockResolvedValueOnce({ kind: 'hidden' });
    await expect(issuePageAt()).rejects.toThrow('NEXT_NOT_FOUND');
    // `loadIssuePage`'s answer for an id no issue has.
    data.loadIssuePage.mockResolvedValueOnce({ kind: 'not-found' });
    await expect(issuePageAt()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('names Learn in the start form, from Contribute, only to a person who uses it (a Learn profile)', async () => {
    data.loadIssuePage.mockResolvedValue({ kind: 'page', page: fullPage() });
    expect(text(await issuePageAt())).not.toContain('You also use GitRanks Learn');
    learn.loadLearnProfile.mockResolvedValue(filledProfile);
    expect(text(await issuePageAt())).toContain('You also use GitRanks Learn');
    learn.loadLearnProfile.mockRejectedValue(new Error('down'));
    expect(text(await issuePageAt())).not.toContain('You also use GitRanks Learn');
    learn.loadLearnProfile.mockClear();
    await issuePageAt({ from: 'learn' });
    expect(learn.loadLearnProfile).not.toHaveBeenCalled();
  });

  it('shows the window without numbers when they cannot be read', async () => {
    data.loadIssueNumbers.mockResolvedValue(null);
    expect(stateOf(await issuePageAt())).toBe('MASKED');
  });
});

describe("the page of one issue from Learn: Learn's parts", () => {
  const PARTS = {
    lesson: { slug: 'a-queue', title: 'A queue: first in, first out' },
    why: 'USES_LEARNED',
    learnOnly: true,
    started: null,
  };

  it('reads them on their own, from Learn only, and says the lesson and why on the masked card', async () => {
    learnParts.loadIssuePageLearn.mockResolvedValue(PARTS);
    const html = await issuePageAt({ from: 'learn' });
    expect(learnParts.loadIssuePageLearn).toHaveBeenCalledWith('q7k2m9xa');
    expect(text(html)).toContain('Uses A queue: first in, first out , which you learned.');
    expect(html).toContain('href="/learn/lessons/a-queue"');
    expect(text(html)).not.toMatch(/acme|#1290/);
    learnParts.loadIssuePageLearn.mockClear();
    await issuePageAt();
    expect(learnParts.loadIssuePageLearn).not.toHaveBeenCalled();
  });

  it('draws the page as today when their read fails', async () => {
    learnParts.loadIssuePageLearn.mockRejectedValue(new Error('down'));
    data.loadIssuePage.mockResolvedValue({ kind: 'page', page: fullPage() });
    const html = await issuePageAt({ from: 'learn' });
    expect(stateOf(html)).toBe('FULL');
    expect(html).not.toContain('data-lesson');
    expect(text(html)).toContain('Fix it and teach me');
  });
});
