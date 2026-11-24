// @vitest-environment jsdom
import { act } from 'react';
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
vi.mock('@/components/workspace/agent/agent-connect', () => ({
  AgentConnect: () => <div data-agent-connect="" />,
}));

const { ISSUE_PAGE_NOTICES, IssuePageLive } = await import('./issue-page-live');
const { fullPage, issueNumbers, issuePage, MASKED_NOW } = await import('@/lib/workspace/__fixtures__/masked-issue');

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
  vi.useRealTimers();
});

const START = {
  connection: { client: 'claude-code' as const, lastCallAt: '2026-10-28T11:00:00.000Z' },
  agent: { onboarded: true, tokens: [], signIn: true },
  waitingPrs: null,
};

const live = (props: Partial<Parameters<typeof IssuePageLive>[0]> = {}) =>
  act(async () =>
    root.render(
      <IssuePageLive
        id="q7k2m9xa"
        page={issuePage()}
        from="learn"
        back={{ href: '/learn/earlier', label: 'Issues' }}
        numbers={issueNumbers}
        openedAt={MASKED_NOW.toISOString()}
        hosted={false}
        start={START}
        alsoLearn={false}
        returning={false}
        {...props}
      />,
    ),
  );
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

  it('shows the closed access and the request to look again when the account is suspended', async () => {
    actions.lookAtIssue.mockResolvedValue({ ok: true, data: { outcome: 'SUSPENDED', page: null } });
    await live();
    await press('See the full issue');
    expect(container.querySelector('[data-fair-use-appeal]')).not.toBeNull();
    expect(container.querySelector('[data-issue-card]')).toBeNull();
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
    await live({ returning: true, from: 'contribute' });
    expect(actions.lookOnReturn).toHaveBeenCalledExactlyOnceWith('q7k2m9xa', 'contribute');
    expect(router.replace).toHaveBeenCalledWith('/my/issues/q7k2m9xa?from=contribute');
    expect(state()).toBe('FULL');
    await live({ returning: false, from: 'contribute' });
    expect(actions.lookOnReturn).toHaveBeenCalledOnce();
  });

  it('stays masked when there was no press of this browser to make', async () => {
    actions.lookOnReturn.mockResolvedValue(null);
    await live({ returning: true });
    expect(state()).toBe('MASKED');
  });
});

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

  it('starts the hosted agent and moves on to the work once it started', async () => {
    actions.startHeldIssue.mockResolvedValue({
      ok: true,
      data: { attempt: { id: 'A_1' }, started: true, refusal: null, value: null, holder: null, until: null },
    });
    actions.readIssuePage.mockResolvedValue({
      ok: true,
      data: issuePage({ state: 'STARTED', startPath: '/my/pull-requests/acme/notebook/1290' }),
    });
    await live({ page: fullPage(), from: 'contribute', hosted: true, start: { ...START, connection: null } });
    await press('Start with the hosted agent');
    expect(actions.startHeldIssue).toHaveBeenCalledWith('q7k2m9xa');
    expect(router.replace).toHaveBeenCalledWith('/my/pull-requests/acme/notebook/1290');
  });

  it('says so when the hosted agent does not start', async () => {
    actions.startHeldIssue.mockResolvedValue({ ok: false, error: 'FAILED' });
    await live({ page: fullPage(), from: 'contribute', hosted: true, start: { ...START, connection: null } });
    await press('Start with the hosted agent');
    expect(notice()).toBe(ISSUE_PAGE_NOTICES.hosted);
    expect(state()).toBe('FULL');
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
