// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/learn/issues',
}));
vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));
const { setLearnIssuesEmailAction } = vi.hoisted(() => ({ setLearnIssuesEmailAction: vi.fn() }));
vi.mock('@/lib/learn/issues.actions', () => ({ setLearnIssuesEmailAction, readMoreLearnFixes: vi.fn() }));
vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
const hint = vi.hoisted(() => ({ present: true }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { IssuesLive, readIssuesMine } = await import('./issues-live');
const { ISSUES_VIEW } = await import('@/lib/learn/issues');
const { learnFixes, listNone, personalList, views, visitorRows } = await import('@/lib/learn/__fixtures__/issues');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
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

const fetchMock = vi.fn();
let container: HTMLDivElement;
let root: Root;

const answer = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
const reads = { looks: null, numbers: null };

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  fetchMock.mockReset();
  setLearnIssuesEmailAction.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  hint.present = true;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const $ = (selector: string) => container.querySelector(selector);
const $$ = (selector: string) => [...container.querySelectorAll(selector)];
const flush = () => act(async () => {});

describe("the person's read", () => {
  it('reads the list, the reads, or why there is none', async () => {
    fetchMock.mockReturnValueOnce(answer({ state: 'ok', list: personalList(), reads }));
    expect(await readIssuesMine(views.course)).toEqual({ state: 'ok', list: personalList(), reads });
    expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/issues?course=algorithms&learned=1', { cache: 'no-store' });
    fetchMock.mockReturnValueOnce(answer({ state: 'unavailable' }));
    expect(await readIssuesMine(ISSUES_VIEW)).toEqual({ state: 'unavailable' });
    fetchMock.mockReturnValueOnce(answer({ state: 'ok', list: null }));
    expect(await readIssuesMine(ISSUES_VIEW)).toEqual({ state: 'unavailable' });
    fetchMock.mockReturnValueOnce(answer({}, 500));
    expect(await readIssuesMine(ISSUES_VIEW)).toEqual({ state: 'failed' });
    fetchMock.mockReturnValueOnce(Promise.reject(new Error('offline')));
    expect(await readIssuesMine(ISSUES_VIEW)).toEqual({ state: 'failed' });
  });
});

describe('Issues in the browser', () => {
  it("puts the person's five in the visitor's place once read", async () => {
    fetchMock.mockReturnValueOnce(answer({ state: 'ok', list: personalList(), reads }));
    await act(async () =>
      root.render(<IssuesLive view={ISSUES_VIEW} initial={{ kind: 'visitor', rows: visitorRows }} />),
    );
    await flush();
    expect($('main')?.getAttribute('data-issues')).toBe('personal');
    expect($$('[data-issues-switch]')).toHaveLength(2);
  });

  it("keeps the visitor's five without a session, and never reads", async () => {
    hint.present = false;
    await act(async () =>
      root.render(<IssuesLive view={ISSUES_VIEW} initial={{ kind: 'visitor', rows: visitorRows }} />),
    );
    expect($('main')?.getAttribute('data-issues')).toBe('visitor');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never reads a personal list for the merged fixes or the unavailable state', async () => {
    await act(async () =>
      root.render(<IssuesLive view={views.courseFixed} initial={{ kind: 'fixed', fixes: learnFixes }} />),
    );
    await act(async () => root.render(<IssuesLive view={ISSUES_VIEW} initial={{ kind: 'unavailable' }} />));
    expect($('main')?.getAttribute('data-issues')).toBe('unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('says the unavailable state when the API does not know the read yet', async () => {
    fetchMock.mockReturnValueOnce(answer({ state: 'unavailable' }));
    await act(async () =>
      root.render(<IssuesLive view={ISSUES_VIEW} initial={{ kind: 'visitor', rows: visitorRows }} />),
    );
    await flush();
    expect($('main')?.getAttribute('data-issues')).toBe('unavailable');
  });

  it('turns the email on for the list the switches show, then says it needs an address, until one is there', async () => {
    fetchMock.mockReturnValueOnce(answer({ state: 'ok', list: listNone({ emailTo: null }), reads }));
    await act(async () => root.render(<IssuesLive view={views.learned} initial={{ kind: 'visitor', rows: [] }} />));
    await flush();
    expect($('[data-issues-email]')?.getAttribute('data-issues-email')).toBe('off');

    setLearnIssuesEmailAction.mockResolvedValueOnce({ ok: true, data: { newIssues: true, newIssuesCover: 'LEARNED' } });
    await act(async () => ($('[data-issues-email] button') as HTMLButtonElement).click());
    await flush();
    expect(setLearnIssuesEmailAction).toHaveBeenCalledWith(true, 'LEARNED');
    expect($('[data-issues-email]')?.getAttribute('data-issues-email')).toBe('no-address');

    // Back on the page with an address set: the line changes in place.
    fetchMock.mockReturnValueOnce(
      answer({ state: 'ok', list: listNone({ emailOn: true, emailTo: 'y***@example.com' }), reads }),
    );
    await act(async () => window.dispatchEvent(new Event('focus')));
    await flush();
    expect($('[data-issues-email]')?.getAttribute('data-issues-email')).toBe('on');
    expect($('[data-issues-email]')?.textContent).toContain('We’ll email you at y***@example.com when one appears.');
  });

  it('says a save that failed, and keeps the button', async () => {
    fetchMock.mockReturnValueOnce(answer({ state: 'ok', list: listNone(), reads }));
    await act(async () => root.render(<IssuesLive view={ISSUES_VIEW} initial={{ kind: 'visitor', rows: [] }} />));
    await flush();
    setLearnIssuesEmailAction.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await act(async () => ($('[data-issues-email] button') as HTMLButtonElement).click());
    await flush();
    expect(setLearnIssuesEmailAction).toHaveBeenCalledWith(true, 'FOR_YOU');
    expect($('[data-issues-email]')?.getAttribute('data-issues-email')).toBe('off');
    expect($('[role="alert"]')?.textContent).toBe('We could not save just now. Try again in a minute.');
  });
});
