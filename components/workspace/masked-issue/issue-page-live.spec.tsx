// @vitest-environment jsdom
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
const actions = vi.hoisted(() => ({
  lookAtIssue: vi.fn(),
  lookOnReturn: vi.fn(),
  readIssuePage: vi.fn(),
  giveBackIssue: vi.fn(),
  setIssueOutReason: vi.fn(),
  saveIssueOutNote: vi.fn(),
  extendIssueLook: vi.fn(),
  startHeldIssue: vi.fn(),
}));
vi.mock('@/lib/workspace/masked-issue.actions', () => actions);
const keptActions = vi.hoisted(() => ({ readIssueKept: vi.fn(async (): Promise<unknown> => null) }));
vi.mock('@/lib/workspace/issue-page-kept.actions', () => keptActions);
const fairUse = vi.hoisted(() => ({ appealFairUse: vi.fn() }));
vi.mock('@/lib/workspace/fair-use.actions', () => fairUse);
vi.mock('@/components/workspace/agent/agent-connect', () => ({
  AgentConnect: ({ onAdded, withVsCode }: { onAdded?: () => void; withVsCode?: boolean }) => (
    <div data-agent-connect="" data-vs-code={withVsCode ? '' : undefined}>
      <button type="button" onClick={onAdded}>
        I added it
      </button>
    </div>
  ),
}));
const changes = vi.hoisted(() => ({ useFastChanges: vi.fn(), useChanges: vi.fn() }));
vi.mock('@/lib/workspace/use-changes', () => changes);

const { ISSUE_PAGE_NOTICES, IssuePageLive } = await import('./issue-page-live');
const { issueStartRefusalOf } = await import('@/lib/workspace/start-refusals');
const { fullPage, HELD_UNTIL, issueNumbers, issuePage, MASKED_NOW } = await import(
  '@/lib/workspace/__fixtures__/masked-issue'
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;
window.matchMedia ??= ((query: string) => ({
  matches: true,
  media: query,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  onchange: null,
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

let container: HTMLDivElement;
let root: Root;
let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(MASKED_NOW);
  writeText = vi.fn(async () => {});
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.localStorage.clear();
  vi.useRealTimers();
});

const START = {
  connection: { client: 'claude-code' as const, lastCallAt: '2026-10-28T11:00:00.000Z' },
  agent: { onboarded: true, tokens: [], signIn: true },
  waitingPrs: null,
};

const live = (props: Partial<Parameters<typeof IssuePageLive>[0]> = {}, strict = false) => {
  const page = (
    <IssuePageLive
      id="q7k2m9xa"
      page={issuePage()}
      from="learn"
      back={{ href: '/learn/issues', label: 'Issues' }}
      numbers={issueNumbers}
      openedAt={MASKED_NOW.toISOString()}
      hosted={false}
      start={START}
      alsoLearn={false}
      returning={false}
      {...props}
    />
  );
  return act(async () => root.render(strict ? <StrictMode>{page}</StrictMode> : page));
};
/** Whether the page waits for the agent: the workspace's poll fast, and the attempts asked about. */
const waiting = () =>
  changes.useChanges.mock.lastCall?.[2] === true && changes.useFastChanges.mock.lastCall?.[0] === true;
const state = () => container.querySelector('[data-issue-page]')?.getAttribute('data-issue-page');
const h1 = () => container.querySelector('h1')?.textContent;
const button = (label: string) =>
  [...container.querySelectorAll<HTMLElement>('button, a')].find(
    (each) => each.textContent?.replace('⏎', '').trim() === label,
  ) ?? null;
const press = (label: string) =>
  act(async () => {
    const element = button(label);
    if (!element) throw new Error(`No button "${label}"`);
    element.click();
  });
const notice = () => container.querySelector('[data-page-notice]')?.textContent;

describe('"See the full issue"', () => {
  it('shows the issue in full in place, held, from the list the person came from', async () => {
    actions.lookAtIssue.mockResolvedValue({ ok: true, data: { outcome: 'OK', page: fullPage() } });
    await live();
    await press('See the full issue');
    expect(actions.lookAtIssue).toHaveBeenCalledWith('q7k2m9xa', 'learn');
    expect(state()).toBe('FULL');
    expect(h1()).toBe('Duplicate tags appear in the sidebar after a rename');
    expect(container.querySelector('[data-held]')?.textContent).toContain('14 minutes left');
  });

  it.each([
    ['TAKEN', 'Someone else is looking at this issue'],
    ['LIMIT', 'You have seen your full issues for today'],
    ['NOT_AVAILABLE', 'This issue is not on your list'],
    ['LEFT_POOL', 'This issue is no longer open for a fix'],
  ] as const)('turns to its end when refused (%s), with or without a page', async (outcome, title) => {
    actions.lookAtIssue.mockResolvedValue({ ok: true, data: { outcome, page: null } });
    await live({ page: issuePage({ looks: null }) });
    await press('See the full issue');
    expect(state()).toBe(outcome);
    expect(h1()).toBe(title);
  });

  it('shows the closed access and the request to look again, which sends, when the account is suspended', async () => {
    actions.lookAtIssue.mockResolvedValue({ ok: true, data: { outcome: 'SUSPENDED', page: null } });
    fairUse.appealFairUse.mockResolvedValue({ ok: true, data: { at: new Date().toISOString(), answeredAt: null } });
    await live();
    await press('See the full issue');
    expect(container.querySelector('[data-fair-use-appeal]')?.getAttribute('data-fair-use-appeal')).toBe('form');
    expect(container.querySelector('[data-ban]')).not.toBeNull();
    expect(container.querySelector('a[href="/terms#contribute-rules"]')).not.toBeNull();
    expect(container.querySelector('[data-issue-card]')).toBeNull();
    const area = container.querySelector('textarea') as HTMLTextAreaElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(area, 'Please look again.');
      area.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => container.querySelector('form')?.requestSubmit());
    expect(fairUse.appealFairUse).toHaveBeenCalledExactlyOnceWith('Please look again.');
    expect(container.querySelector('[data-fair-use-appeal]')?.getAttribute('data-fair-use-appeal')).toBe('open');
  });

  it('stays as it was and says so when the press does not go through', async () => {
    actions.lookAtIssue.mockResolvedValue({ ok: false, error: 'FAILED' });
    await live();
    await press('See the full issue');
    expect(state()).toBe('MASKED');
    expect(notice()).toBe(ISSUE_PAGE_NOTICES.look);
  });

  it('sees it again after the 15 minutes', async () => {
    actions.lookAtIssue.mockResolvedValue({ ok: true, data: { outcome: 'OK', page: fullPage() } });
    await live({ page: issuePage({ state: 'EXPIRED' }) });
    await press('See the full issue again');
    expect(state()).toBe('FULL');
  });
});

describe('back from the sign-in', () => {
  it('makes the press made before it, once, and drops it from the address', async () => {
    actions.lookOnReturn.mockResolvedValue({ ok: true, data: { outcome: 'OK', page: fullPage() } });
    // Strict mode runs the effect twice, and the page renders again with the same address: still one press.
    await live({ returning: true, from: 'contribute' }, true);
    await live({ returning: true, from: 'contribute' }, true);
    expect(actions.lookOnReturn).toHaveBeenCalledExactlyOnceWith('q7k2m9xa', 'contribute', true);
    expect(router.replace).toHaveBeenCalledWith('/my/issues/q7k2m9xa?from=contribute');
    expect(state()).toBe('FULL');
  });

  it("keeps the Learn view's filters in the address it drops the press from, for the way back", async () => {
    actions.lookOnReturn.mockResolvedValue({ ok: true, data: { outcome: 'OK', page: fullPage() } });
    await live({ returning: true, view: 'lesson=a-queue&for-you=0' });
    expect(router.replace).toHaveBeenCalledWith('/my/issues/q7k2m9xa?from=learn&lesson=a-queue&for-you=0');
  });

  it('uses the mark up, making no press, when the page is already past its hidden details', async () => {
    actions.lookOnReturn.mockResolvedValue(null);
    await live({ returning: true, page: fullPage() });
    expect(actions.lookOnReturn).toHaveBeenCalledExactlyOnceWith('q7k2m9xa', 'learn', false);
    expect(state()).toBe('FULL');
  });

  it('stays masked when there was no press of this browser to make', async () => {
    actions.lookOnReturn.mockResolvedValue(null);
    await live({ returning: true });
    expect(state()).toBe('MASKED');
  });
});

/** A hosted start's answer that refused, with `code`. */
const refusal = (code: string, rest: Record<string, unknown> = {}) => ({
  attempt: null,
  started: false,
  refusal: code,
  value: null,
  holder: null,
  until: null,
  ...rest,
});
const hostedPage = {
  page: fullPage(),
  from: 'contribute' as const,
  hosted: true,
  start: { ...START, connection: null },
};

describe('while it is held', () => {
  it('holds it 30 minutes once the prompt is copied, and waits for the agent', async () => {
    const longer = fullPage({ until: '2026-10-28T12:30:00.000Z' });
    actions.extendIssueLook.mockResolvedValue({ ok: true, data: longer });
    await live({ page: fullPage() });
    await press('Copy the prompt');
    expect(writeText).toHaveBeenCalled();
    expect(actions.extendIssueLook).toHaveBeenCalledWith('q7k2m9xa');
    expect(container.querySelector('[data-held]')?.textContent).toContain('30 minutes left');
  });

  it('holds it 30 minutes once "I added it" is pressed in the connect steps, and waits for the agent', async () => {
    actions.extendIssueLook.mockResolvedValue({ ok: true, data: fullPage({ until: '2026-10-28T12:30:00.000Z' }) });
    await live({ page: fullPage(), start: { ...START, connection: null } });
    expect(waiting()).toBe(false);
    await press('I added it');
    expect(actions.extendIssueLook).toHaveBeenCalledWith('q7k2m9xa');
    expect(waiting()).toBe(true);
  });

  it("waits for the person's agent at once when the page opens in full with it connected (a reload)", async () => {
    await live({ page: fullPage() });
    expect(waiting()).toBe(true);
    expect(actions.extendIssueLook).not.toHaveBeenCalled();
  });

  it('starts the hosted agent and moves on to the work once it started', async () => {
    actions.startHeldIssue.mockResolvedValue({
      ok: true,
      data: { attempt: { id: 'A_1' }, started: true, refusal: null, value: null, holder: null, until: null },
    });
    actions.readIssuePage.mockResolvedValue({
      ok: true,
      data: issuePage({ state: 'STARTED', startPath: '/my/pull-requests/acme/notebook/1290' }),
    });
    await live(hostedPage);
    await press('Start with the hosted agent');
    expect(actions.startHeldIssue).toHaveBeenCalledWith('q7k2m9xa');
    expect(router.replace).toHaveBeenCalledWith('/my/pull-requests/acme/notebook/1290');
  });

  it('says so when the hosted agent does not start', async () => {
    actions.startHeldIssue.mockResolvedValue({ ok: false, error: 'FAILED' });
    await live(hostedPage);
    await press('Start with the hosted agent');
    expect(notice()).toBe(ISSUE_PAGE_NOTICES.hosted);
    expect(state()).toBe('FULL');
  });

  it.each([
    ['KEY_INVALID', 'Replace the key'],
    ['NO_KEY', 'Add a key'],
    ['BUDGET', 'Budget and pacing'],
    ['DAILY_LIMIT', null],
    ['ACCOUNT_PAUSED', 'Write to us'],
  ])(
    'says why the hosted agent did not start (%s), in the words of a Start, with its next step',
    async (code, link) => {
      const answer = refusal(code);
      actions.startHeldIssue.mockResolvedValue({ ok: true, data: answer });
      await live(hostedPage);
      await press('Start with the hosted agent');
      const said = issueStartRefusalOf(answer as never)?.text ?? '';
      expect(notice()).toBe(link ? `${said} ${link}` : said);
      expect(notice()).not.toContain(ISSUE_PAGE_NOTICES.hosted);
      expect(state()).toBe('FULL');
    },
  );

  it('says the open pull request limit in its one sentence', async () => {
    actions.startHeldIssue.mockResolvedValue({ ok: true, data: refusal('LIMIT_REACHED', { value: 3 }) });
    await live(hostedPage);
    await press('Start with the hosted agent');
    expect(notice()).toBe(
      '3 of your pull requests are waiting on maintainers. A new one can start when one is merged or closed.',
    );
  });

  it.each([
    ['TAKEN', 'TAKEN'],
    ['CLOSED', 'LEFT_POOL'],
  ])('turns to its end when the hosted start is refused with %s', async (code, ended) => {
    actions.startHeldIssue.mockResolvedValue({ ok: true, data: refusal(code) });
    await live(hostedPage);
    await press('Start with the hosted agent');
    expect(state()).toBe(ended);
    expect(notice()).toBeUndefined();
  });

  it('shows the connect steps to someone with no agent yet', async () => {
    await live({ page: fullPage(), start: { ...START, connection: null } });
    expect(container.querySelector('[data-agent-connect]')).not.toBeNull();
  });
});

describe('"Give it back"', () => {
  it('turns the page to the reasons, each saved as it is pressed', async () => {
    actions.giveBackIssue.mockResolvedValue({ ok: true, data: issuePage({ state: 'GIVEN_BACK' }) });
    actions.setIssueOutReason.mockResolvedValue({ ok: true, data: issuePage({ state: 'GIVEN_BACK' }) });
    await live({ page: fullPage() });
    await press('Give it back');
    expect(actions.giveBackIssue).toHaveBeenCalledWith('q7k2m9xa');
    expect(state()).toBe('GIVEN_BACK');
    // The end's way back is the page's own: the list the person came from, never Learn's earlier page.
    expect(button('Back to Issues')?.getAttribute('href')).toBe('/learn/issues');
    await press('It is already fixed');
    expect(actions.setIssueOutReason).toHaveBeenCalledWith('q7k2m9xa', 'FIXED', true);
    expect(button('It is already fixed')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps the issue and says so when it was not given back', async () => {
    actions.giveBackIssue.mockResolvedValue({ ok: false, error: 'FAILED' });
    await live({ page: fullPage() });
    await press('Give it back');
    expect(state()).toBe('FULL');
    expect(notice()).toBe(ISSUE_PAGE_NOTICES.giveBack);
  });
});

describe("the browser's mark of the held issue, for the lists", () => {
  const mark = () => {
    const raw = window.localStorage.getItem('gitranks:held-issue');
    return raw ? JSON.parse(raw) : null;
  };
  const LONGER = '2026-10-28T12:30:00.000Z';

  it('is written when a look starts, and moved when it is held longer', async () => {
    actions.lookAtIssue.mockResolvedValue({ ok: true, data: { outcome: 'OK', page: fullPage() } });
    actions.extendIssueLook.mockResolvedValue({ ok: true, data: fullPage({ until: LONGER }) });
    await live();
    expect(mark()).toBeNull();
    await press('See the full issue');
    expect(mark()).toEqual({ id: 'q7k2m9xa', until: HELD_UNTIL });
    await press('Copy the prompt');
    expect(mark()).toEqual({ id: 'q7k2m9xa', until: LONGER });
  });

  it('is written for another issue the page says is held', async () => {
    await live({ page: issuePage({ holding: { id: 'r3n8p1vd', until: HELD_UNTIL } }) });
    expect(mark()).toEqual({ id: 'r3n8p1vd', until: HELD_UNTIL });
  });

  it('is cleared when the issue is given back', async () => {
    actions.giveBackIssue.mockResolvedValue({ ok: true, data: issuePage({ state: 'GIVEN_BACK' }) });
    await live({ page: fullPage() });
    expect(mark()?.id).toBe('q7k2m9xa');
    await press('Give it back');
    expect(mark()).toBeNull();
  });

  it('is cleared when the work starts', async () => {
    actions.startHeldIssue.mockResolvedValue({
      ok: true,
      data: { attempt: { id: 'A_1' }, started: true, refusal: null, value: null, holder: null, until: null },
    });
    actions.readIssuePage.mockResolvedValue({
      ok: true,
      data: issuePage({ state: 'STARTED', startPath: '/my/pull-requests/acme/notebook/1290' }),
    });
    await live({ ...hostedPage, page: fullPage() });
    expect(mark()?.id).toBe('q7k2m9xa');
    await press('Start with the hosted agent');
    expect(mark()).toBeNull();
  });

  it("is cleared when the page shows the hold ended, and never touches another issue's mark", async () => {
    window.localStorage.setItem('gitranks:held-issue', JSON.stringify({ id: 'r3n8p1vd', until: HELD_UNTIL }));
    await live({ page: issuePage({ state: 'EXPIRED' }) });
    expect(mark()?.id).toBe('r3n8p1vd');
    window.localStorage.setItem('gitranks:held-issue', JSON.stringify({ id: 'q7k2m9xa', until: HELD_UNTIL }));
    act(() => root.unmount());
    root = createRoot(container);
    await live({ page: issuePage({ state: 'EXPIRED' }) });
    expect(mark()).toBeNull();
  });

  it('ends by itself at its time: a list reads no mark past it', async () => {
    const { readHeldMark, writeHeldMark } = await import('@/lib/workspace/held-mark');
    writeHeldMark({ id: 'q7k2m9xa', until: HELD_UNTIL });
    expect(readHeldMark(Date.parse(HELD_UNTIL) - 1_000)?.id).toBe('q7k2m9xa');
    expect(readHeldMark(Date.parse(HELD_UNTIL))).toBeNull();
    expect(mark()).toBeNull();
  });
});

describe("the page of one issue, live: Learn's parts", () => {
  const LEARN = {
    lesson: { slug: 'a-queue', title: 'A queue: first in, first out' },
    why: 'TEACHES_NEW' as const,
    learnOnly: true,
    started: { agent: 'Claude Code', at: '2026-10-28T11:48:00.000Z', walkthrough: true },
  };
  const NO_AGENT = { ...START, connection: null };
  const lessonLine = () => container.querySelector('[data-lesson]')?.textContent;
  /** The page keeps the page it was first given: a new one is drawn on a new root. */
  const fresh = () => {
    act(() => root.unmount());
    root = createRoot(container);
  };

  it('from Learn, says the lesson and why, has no "How" step for an issue kept for learners, and offers VS Code', async () => {
    await live({ learn: LEARN });
    expect(lessonLine()).toBe('Teaches A queue: first in, first out, which is new for you.');
    fresh();
    await live({ learn: LEARN, page: fullPage(), start: NO_AGENT });
    expect(container.querySelector('[data-learn-only]')).not.toBeNull();
    expect(container.querySelector('[data-agent-connect]')?.hasAttribute('data-vs-code')).toBe(true);
  });

  it('from Learn, says how the work started', async () => {
    await live({
      learn: LEARN,
      page: issuePage({ state: 'STARTED', startPath: '/my/pull-requests/acme/notebook/1290' }),
    });
    expect(container.textContent).toContain('Claude Code started it 12 minutes ago, with the walkthrough.');
  });

  it('from Learn without the parts (their read failed), draws the page as before', async () => {
    await live({ learn: null, page: fullPage() });
    expect(container.querySelector('[data-lesson]')).toBeNull();
    expect(container.querySelector('[data-learn-only]')).toBeNull();
    expect([...container.querySelectorAll('[data-step] h3')].map((each) => each.textContent)[0]).toBe('How');
  });

  it("from Contribute, shows none of Learn's parts, and offers the same agents, VS Code included", async () => {
    await live({ from: 'contribute', learn: LEARN, back: { href: '/contribute#issues', label: 'Issues' } });
    expect(container.querySelector('[data-lesson]')).toBeNull();
    fresh();
    await live({ from: 'contribute', learn: LEARN, page: fullPage(), start: NO_AGENT });
    expect(container.querySelector('[data-learn-only]')).toBeNull();
    expect(container.querySelector('[data-agent-connect]')?.hasAttribute('data-vs-code')).toBe(true);
    fresh();
    await live({
      from: 'contribute',
      learn: LEARN,
      page: issuePage({ state: 'STARTED', startPath: '/my/pull-requests/acme/notebook/1290' }),
    });
    expect(container.textContent).toContain('Your agent is on it.');
    expect(container.textContent).not.toMatch(/walkthrough/i);
  });
});

describe('the page of one issue, live: an issue kept for learners, from Contribute', () => {
  const CONTRIBUTE = { from: 'contribute', back: { href: '/contribute#issues', label: 'Issues' } } as const;
  const keptLine = () => container.querySelector('[data-kept-line]')?.textContent;

  it('offers no press when the read says it is kept, and the way to it in Learn to a person who uses Learn', async () => {
    await live({ ...CONTRIBUTE, kept: { until: null }, alsoLearn: true });
    expect(keptLine()).toBe('This issue is kept for learners.');
    expect(button('See the full issue')).toBeNull();
    expect(button('Open it in Learn')?.getAttribute('href')).toBe('/my/issues/q7k2m9xa?from=learn');
    await live({ ...CONTRIBUTE, kept: { until: null }, alsoLearn: false });
    expect(button('Open it in Learn')).toBeNull();
  });

  it('says the kept line in place of the plain end when a press is refused and the read again says kept', async () => {
    actions.lookAtIssue.mockResolvedValue({
      ok: true,
      data: { outcome: 'NOT_AVAILABLE', page: issuePage({ state: 'NOT_AVAILABLE' }) },
    });
    keptActions.readIssueKept.mockResolvedValueOnce({ until: null });
    await live({ ...CONTRIBUTE, alsoLearn: true });
    await press('See the full issue');
    expect(keptActions.readIssueKept).toHaveBeenCalledExactlyOnceWith('q7k2m9xa');
    expect(state()).toBe('NOT_AVAILABLE');
    expect(h1()).toBe('This issue is kept for learners');
    expect(button('Open it in Learn')).not.toBeNull();
    expect(container.textContent).not.toContain('This issue is not on your list');
  });

  it('keeps the plain end when the read again says nothing', async () => {
    actions.lookAtIssue.mockResolvedValue({ ok: true, data: { outcome: 'NOT_AVAILABLE', page: null } });
    await live(CONTRIBUTE);
    await press('See the full issue');
    expect(keptActions.readIssueKept).toHaveBeenCalledOnce();
    expect(h1()).toBe('This issue is not on your list');
  });

  it('keeps the plain end when the read again fails', async () => {
    actions.lookAtIssue.mockResolvedValue({ ok: true, data: { outcome: 'NOT_AVAILABLE', page: null } });
    keptActions.readIssueKept.mockRejectedValueOnce(new Error('down'));
    await live(CONTRIBUTE);
    await press('See the full issue');
    expect(h1()).toBe('This issue is not on your list');
  });

  it("asks nothing again on Learn's page, where the person can take it", async () => {
    actions.lookAtIssue.mockResolvedValue({ ok: true, data: { outcome: 'NOT_AVAILABLE', page: null } });
    await live();
    await press('See the full issue');
    expect(keptActions.readIssueKept).not.toHaveBeenCalled();
    expect(h1()).toBe('This issue is not on your list');
  });

  it('asks nothing again for any other refusal', async () => {
    actions.lookAtIssue.mockResolvedValue({ ok: true, data: { outcome: 'TAKEN', page: null } });
    await live(CONTRIBUTE);
    await press('See the full issue');
    expect(keptActions.readIssueKept).not.toHaveBeenCalled();
    expect(h1()).toBe('Someone else is looking at this issue');
  });

  it('is not said from Learn, even with the read', async () => {
    await live({ kept: { until: null }, alsoLearn: true });
    expect(container.querySelector('[data-kept]')).toBeNull();
    expect(button('See the full issue')).not.toBeNull();
  });
});
