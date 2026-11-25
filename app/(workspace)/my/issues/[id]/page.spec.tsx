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
const keptRead = vi.hoisted(() => ({ loadIssuePageKept: vi.fn() }));
vi.mock('@/lib/workspace/issue-page-kept.data', () => keptRead);
const learn = vi.hoisted(() => ({ loadLearnSetupOfMine: vi.fn(), loadUsesLearnSide: vi.fn() }));
vi.mock('@/lib/learn/learn.data', () => learn);

const { default: MaskedIssuePage } = await import('./page');
const { fullPage, issueNumbers, issuePage, looksAtLimit, MASKED_NOW } = await import(
  '@/lib/workspace/__fixtures__/masked-issue'
);

const OPEN = { kind: 'open', signs: { contribute: true, learn: true }, agents: { hosted: false, own: true } } as const;
/** A setup of Learn the person saved, as the API answers it. */
const SETUP_SAVED = { state: 'SAVED', mainLanguage: 'python', otherLanguages: [], level: 2, guessed: [] } as const;
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
  learn.loadLearnSetupOfMine.mockResolvedValue(null);
  learn.loadUsesLearnSide.mockResolvedValue(false);
  learnParts.loadIssuePageLearn.mockResolvedValue(null);
  keptRead.loadIssuePageKept.mockResolvedValue(null);
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
    learn.loadLearnSetupOfMine.mockResolvedValue(SETUP_SAVED);
    expect(await issuePageAt({ from: 'contribute' })).toContain('href="/contribute#issues"');
    expect(await issuePageAt({ from: 'contribute' })).not.toContain('href="/learn/issues');
  });

  it("leads back, when the address names no side, to Learn's Issues for a person who uses Learn, else Contribute's", async () => {
    // No setup of Learn: Contribute's.
    learn.loadLearnSetupOfMine.mockResolvedValue({ ...SETUP_SAVED, state: 'NONE' });
    expect(await issuePageAt()).toContain('href="/contribute#issues"');
    expect(await issuePageAt({ from: 'elsewhere' })).toContain('href="/contribute#issues"');
    learn.loadLearnSetupOfMine.mockResolvedValue(null);
    expect(await issuePageAt()).toContain('href="/contribute#issues"');
    learn.loadLearnSetupOfMine.mockResolvedValue(SETUP_SAVED);
    const learner = await issuePageAt();
    expect(learner).toContain('href="/learn/issues"');
    expect(learner).not.toContain('href="/contribute#issues"');
  });

  it('counts a saved setup of Learn as using Learn, and a guess or a failed read as not', async () => {
    // A guess a visit to Learn started is not a save.
    learn.loadLearnSetupOfMine.mockResolvedValue({ ...SETUP_SAVED, state: 'GUESSED' });
    expect(await issuePageAt()).toContain('href="/contribute#issues"');
    learn.loadLearnSetupOfMine.mockRejectedValue(new Error('down'));
    expect(await issuePageAt()).toContain('href="/contribute#issues"');
    // Someone who used Learn without saving a setup is on Learn's side too.
    learn.loadUsesLearnSide.mockResolvedValueOnce(true);
    expect(await issuePageAt()).toContain('href="/learn/issues"');
    // Never read from Learn, where the side is known.
    learn.loadLearnSetupOfMine.mockClear();
    await issuePageAt({ from: 'learn' });
    expect(learn.loadLearnSetupOfMine).not.toHaveBeenCalled();
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

  it('names Learn in the start form, from Contribute, while the Learn sign is not known, by a saved setup', async () => {
    gate.loadWorkspaceGate.mockResolvedValue({ ...OPEN, signs: { contribute: true, learn: null } });
    data.loadIssuePage.mockResolvedValue({ kind: 'page', page: fullPage() });
    expect(text(await issuePageAt())).not.toContain('You also use GitRanks Learn');
    learn.loadLearnSetupOfMine.mockResolvedValue(SETUP_SAVED);
    expect(text(await issuePageAt())).toContain('You also use GitRanks Learn');
    learn.loadLearnSetupOfMine.mockRejectedValue(new Error('down'));
    expect(text(await issuePageAt())).not.toContain('You also use GitRanks Learn');
    learn.loadLearnSetupOfMine.mockClear();
    await issuePageAt({ from: 'learn' });
    expect(learn.loadLearnSetupOfMine).not.toHaveBeenCalled();
  });

  it('shows the window without numbers when they cannot be read', async () => {
    data.loadIssueNumbers.mockResolvedValue(null);
    expect(stateOf(await issuePageAt())).toBe('MASKED');
  });
});

describe('the page of one issue by the signs', () => {
  const signed = (contribute: boolean | null, learn: boolean | null) =>
    gate.loadWorkspaceGate.mockResolvedValue({ ...OPEN, signs: { contribute, learn } });
  const setupLine = (html: string) => /data-setup-line="">([^<]*)</.exec(html)?.[1] ?? null;
  const form = (html: string) => /data-start-form="(\w+)"/.exec(html)?.[1] ?? null;
  const CONTRIBUTE_LINE =
    'First time here? A 2-minute setup shows how Contribute works, then you come back to this issue.';
  const LEARN_LINE = 'First time here? A 2-minute setup shows how Learn works, then you come back to this issue.';

  beforeEach(() => {
    data.loadIssuePage.mockResolvedValue({ kind: 'page', page: fullPage() });
  });

  it('a visitor is not drawn here: the layout asks them to sign in first', async () => {
    gate.loadWorkspaceGate.mockResolvedValue({ kind: 'signed-out' });
    await expect(issuePageAt({ from: 'contribute' })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('no sign: Contribute’s setup from Contribute and from no product, Learn’s from Learn; reading stays open', async () => {
    signed(false, false);
    for (const from of ['contribute', 'email', 'agent', '']) {
      const html = await issuePageAt(from ? { from } : {});
      expect(setupLine(html)).toBe(CONTRIBUTE_LINE);
      expect(form(html)).toBeNull();
    }
    const learnHtml = await issuePageAt({ from: 'learn' });
    expect(setupLine(learnHtml)).toBe(LEARN_LINE);
    expect(form(learnHtml)).toBeNull();
    data.loadIssuePage.mockResolvedValue({ kind: 'page', page: issuePage() });
    expect(text(await issuePageAt({ from: 'contribute' }))).toContain('See the full issue');
  });

  it('the Contribute sign only: today’s form from Contribute with no walkthrough line, Learn’s setup from Learn', async () => {
    signed(true, false);
    learn.loadLearnSetupOfMine.mockResolvedValue(SETUP_SAVED);
    const contribute = await issuePageAt({ from: 'contribute' });
    expect(form(contribute)).toBe('contribute');
    expect(setupLine(contribute)).toBeNull();
    expect(text(contribute)).not.toContain('You also use GitRanks Learn');
    expect(setupLine(await issuePageAt({ from: 'learn' }))).toBe(LEARN_LINE);
    expect(form(await issuePageAt({ from: 'email' }))).toBe('contribute');
  });

  it('the Learn sign only: Learn’s form with no "Just fix it", from Learn and from no product; Contribute’s setup from Contribute', async () => {
    signed(false, true);
    const fromLearn = await issuePageAt({ from: 'learn' });
    expect(form(fromLearn)).toBe('learn');
    expect(text(fromLearn)).not.toContain('Just fix it');
    expect(text(fromLearn)).toContain('with GitRanks Learn and teach me');
    const fromEmail = await issuePageAt({ from: 'email' });
    expect(form(fromEmail)).toBe('learn');
    expect(fromEmail).toContain('href="/learn/issues"');
    expect(setupLine(await issuePageAt({ from: 'contribute' }))).toBe(CONTRIBUTE_LINE);
  });

  it('both signs: "Just fix it" from Learn, and the walkthrough line from Contribute', async () => {
    signed(true, true);
    const fromLearn = await issuePageAt({ from: 'learn' });
    expect(form(fromLearn)).toBe('learn');
    expect(text(fromLearn)).toContain('Just fix it');
    const fromContribute = await issuePageAt({ from: 'contribute' });
    expect(form(fromContribute)).toBe('contribute');
    expect(text(fromContribute)).toContain('You also use GitRanks Learn');
  });

  it('the signs unreadable: today’s page, no setup, the walkthrough line by a saved setup', async () => {
    signed(null, null);
    learn.loadLearnSetupOfMine.mockResolvedValue(SETUP_SAVED);
    for (const from of ['contribute', 'learn', 'email']) {
      const html = await issuePageAt({ from });
      expect(setupLine(html)).toBeNull();
      expect(form(html)).toBe(from === 'learn' ? 'learn' : 'contribute');
    }
    expect(text(await issuePageAt({ from: 'contribute' }))).toContain('You also use GitRanks Learn');
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

describe('the page of one issue from Contribute: an issue kept for learners', () => {
  const ALWAYS = { until: null };

  it('reads it on its own from Contribute or a side the address does not name, never from Learn', async () => {
    await issuePageAt({ from: 'contribute' });
    expect(keptRead.loadIssuePageKept).toHaveBeenCalledWith('q7k2m9xa');
    keptRead.loadIssuePageKept.mockClear();
    await issuePageAt();
    expect(keptRead.loadIssuePageKept).toHaveBeenCalledOnce();
    keptRead.loadIssuePageKept.mockClear();
    await issuePageAt({ from: 'learn' });
    expect(keptRead.loadIssuePageKept).not.toHaveBeenCalled();
  });

  it('says it is kept in one line, with no "See the full issue", and the way back as it is', async () => {
    keptRead.loadIssuePageKept.mockResolvedValue(ALWAYS);
    const html = await issuePageAt({ from: 'contribute' });
    expect(stateOf(html)).toBe('MASKED');
    expect(text(html)).toContain('This issue is kept for learners.');
    expect(text(html)).not.toContain('See the full issue');
    expect(html).toContain('href="/contribute#issues"');
    expect(text(html)).not.toMatch(/acme|#1290|—/);
  });

  it('says it is kept for now, writing when it opens only in the browser', async () => {
    keptRead.loadIssuePageKept.mockResolvedValue({ until: '2026-10-28T14:30:00.000Z' });
    const html = text(await issuePageAt({ from: 'contribute' }));
    expect(html).toContain('This issue is kept for learners for now.');
    expect(html).not.toContain('It opens to Contribute');
  });

  it('offers no start on an issue held in full', async () => {
    keptRead.loadIssuePageKept.mockResolvedValue(ALWAYS);
    data.loadIssuePage.mockResolvedValue({ kind: 'page', page: fullPage() });
    const html = text(await issuePageAt({ from: 'contribute' }));
    expect(html).toContain('This issue is kept for learners.');
    expect(html).not.toContain('Claude Code is connected');
  });

  it('leads a person who uses Learn to the same issue in Learn; others get no such link', async () => {
    keptRead.loadIssuePageKept.mockResolvedValue(ALWAYS);
    expect(await issuePageAt({ from: 'contribute' })).not.toContain('Open it in Learn');
    learn.loadLearnSetupOfMine.mockResolvedValue(SETUP_SAVED);
    const html = await issuePageAt({ from: 'contribute' });
    expect(/href="([^"]*)"[^>]*>Open it in Learn/.exec(html)?.[1]).toBe('/my/issues/q7k2m9xa?from=learn');
  });

  it("keeps the plain end of a not available page: the person's own skip or give-back, before any press", async () => {
    keptRead.loadIssuePageKept.mockResolvedValue(ALWAYS);
    learn.loadLearnSetupOfMine.mockResolvedValue(SETUP_SAVED);
    data.loadIssuePage.mockResolvedValue({ kind: 'page', page: issuePage({ state: 'NOT_AVAILABLE' }) });
    const html = await issuePageAt({ from: 'contribute' });
    expect(text(html)).toContain('This issue is not on your list');
    expect(text(html)).not.toContain('kept for learners');
    expect(html).not.toContain('Open it in Learn');
  });

  it('draws the press when the kept time has already passed', async () => {
    keptRead.loadIssuePageKept.mockResolvedValue({ until: '2026-10-28T11:00:00.000Z' });
    const html = text(await issuePageAt({ from: 'contribute' }));
    expect(html).toContain('See the full issue');
    expect(html).not.toContain('kept for learners');
  });

  it("draws Learn's page as it is: the read is not made, and a kept answer is not shown", async () => {
    keptRead.loadIssuePageKept.mockResolvedValue(ALWAYS);
    const html = text(await issuePageAt({ from: 'learn' }));
    expect(html).toContain('See the full issue');
    expect(html).not.toContain('kept for learners');
  });

  it("draws today's page when the API does not answer it or the read fails", async () => {
    keptRead.loadIssuePageKept.mockResolvedValue(null);
    expect(text(await issuePageAt({ from: 'contribute' }))).toContain('See the full issue');
    keptRead.loadIssuePageKept.mockRejectedValue(new Error('down'));
    const html = text(await issuePageAt({ from: 'contribute' }));
    expect(html).toContain('See the full issue');
    expect(html).not.toContain('kept for learners');
  });
});
