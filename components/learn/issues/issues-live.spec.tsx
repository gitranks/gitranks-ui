// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/learn/issues' }));
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

const { ADDRESS_READ_GAP_MS, IssuesLive, readIssuesMine } = await import('./issues-live');
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
  router.refresh.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  hint.present = true;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const $ = (selector: string) => container.querySelector(selector);
const $$ = (selector: string) => [...container.querySelectorAll(selector)];
const flush = () => act(async () => {});

describe("the person's read", () => {
  it('reads the list, the reads, or why there is none', async () => {
    fetchMock.mockReturnValueOnce(answer({ state: 'ok', list: personalList(), reads }));
    expect(await readIssuesMine(views.course)).toEqual({ state: 'ok', list: personalList(), reads, sign: null });
    fetchMock.mockReturnValueOnce(answer({ state: 'ok', list: personalList(), reads, learnOnboarded: false }));
    expect(await readIssuesMine(views.lesson)).toEqual({ state: 'ok', list: personalList(), reads, sign: false });
    expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/issues?course=algorithms&learned=1', { cache: 'no-store' });
    fetchMock.mockReturnValueOnce(answer({ state: 'unavailable' }));
    expect(await readIssuesMine(ISSUES_VIEW)).toEqual({ state: 'unavailable' });
    fetchMock.mockReturnValueOnce(answer({ state: 'managed' }));
    expect(await readIssuesMine(ISSUES_VIEW)).toEqual({ state: 'managed' });
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

  it("marks the fixes a person passed on a lesson's own view, after reading their five and their walkthroughs", async () => {
    const passedRow = { fix: { ...learnFixes.rows[0], lesson: null }, passedAt: '2026-11-18T11:00:00Z' };
    fetchMock.mockImplementation((url: string) =>
      url.endsWith('/walkthroughs')
        ? answer({ walkthroughs: [passedRow] })
        : answer({ state: 'ok', list: personalList(), reads }),
    );
    await act(async () =>
      root.render(
        <IssuesLive
          view={views.lesson}
          at="lesson"
          initial={{ kind: 'visitor', rows: visitorRows }}
          fixes={{ kind: 'fixed', fixes: learnFixes }}
        />,
      ),
    );
    await flush();
    expect($('main')?.getAttribute('data-issues')).toBe('personal');
    expect($$('[data-fix-passed]')).toHaveLength(1);
    expect(fetchMock.mock.calls.map(([url]) => url).sort()).toEqual([
      '/api/me/learn/issues?lesson=find-duplicates-with-a-set',
      '/api/me/learn/progress/walkthroughs',
    ]);
  });

  it('never asks for the walkthroughs without a session, nor with the open issues alone', async () => {
    hint.present = false;
    await act(async () =>
      root.render(
        <IssuesLive
          view={views.lesson}
          at="lesson"
          initial={{ kind: 'visitor', rows: visitorRows }}
          fixes={{ kind: 'fixed', fixes: learnFixes }}
        />,
      ),
    );
    expect($$('[data-real-fix]')).toHaveLength(2);
    expect(fetchMock).not.toHaveBeenCalled();
    hint.present = true;
    fetchMock.mockImplementation(() => answer({ state: 'ok', list: personalList(), reads }));
    act(() => root.unmount());
    root = createRoot(container);
    await act(async () =>
      root.render(
        <IssuesLive
          view={{ ...views.lesson, show: 'open' }}
          at="lesson"
          initial={{ kind: 'visitor', rows: visitorRows }}
        />,
      ),
    );
    await flush();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/me/learn/issues?lesson=find-duplicates-with-a-set',
    ]);
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

  it('reads for an address once while one read is out, then not again for 30 seconds', async () => {
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    fetchMock.mockReturnValueOnce(answer({ state: 'ok', list: listNone({ emailOn: true, emailTo: null }), reads }));
    await act(async () => root.render(<IssuesLive view={ISSUES_VIEW} initial={{ kind: 'visitor', rows: [] }} />));
    await flush();
    expect($('[data-issues-email]')?.getAttribute('data-issues-email')).toBe('no-address');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Coming back fires both "focus" and "visibilitychange": one read.
    let answerRead: (res: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (answerRead = resolve)));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () =>
      answerRead(
        new Response(JSON.stringify({ state: 'ok', list: listNone({ emailOn: true, emailTo: null }), reads })),
      ),
    );
    await flush();

    // Back again within 30 seconds: no read; after them, one.
    now += ADDRESS_READ_GAP_MS - 1;
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    now += 1;
    fetchMock.mockReturnValueOnce(answer({ state: 'ok', list: listNone({ emailOn: true, emailTo: null }), reads }));
    await act(async () => window.dispatchEvent(new Event('focus')));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('never reads on focus while the line about an address is not shown', async () => {
    fetchMock.mockReturnValueOnce(answer({ state: 'ok', list: personalList({ emailOn: true, emailTo: null }), reads }));
    await act(async () =>
      root.render(<IssuesLive view={ISSUES_VIEW} initial={{ kind: 'visitor', rows: visitorRows }} />),
    );
    await flush();
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("tries the page again for a failed public list, and the person's own again for theirs", async () => {
    hint.present = false;
    await act(async () => root.render(<IssuesLive view={ISSUES_VIEW} initial={{ kind: 'failed' }} />));
    await act(async () => ($('[data-issues-box="failed"] button') as HTMLButtonElement).click());
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();

    // The merged fixes are the page's own too.
    hint.present = true;
    await act(async () => root.render(<IssuesLive view={views.courseFixed} initial={{ kind: 'failed' }} />));
    await act(async () => ($('[data-issues-box="failed"] button') as HTMLButtonElement).click());
    expect(router.refresh).toHaveBeenCalledTimes(2);
    expect(fetchMock).not.toHaveBeenCalled();

    // The person's list failed: it is read again, and the page is not.
    fetchMock.mockReturnValueOnce(answer({}, 500));
    await act(async () =>
      root.render(<IssuesLive view={ISSUES_VIEW} initial={{ kind: 'visitor', rows: visitorRows }} />),
    );
    await flush();
    expect($('main')?.getAttribute('data-issues')).toBe('failed');
    fetchMock.mockReturnValueOnce(answer({ state: 'ok', list: personalList(), reads }));
    await act(async () => ($('[data-issues-box="failed"] button') as HTMLButtonElement).click());
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(router.refresh).toHaveBeenCalledTimes(2);
    expect($('main')?.getAttribute('data-issues')).toBe('personal');
  });

  it("tries both again when the person's list and the merged fixes both failed", async () => {
    fetchMock.mockReturnValueOnce(answer({}, 500));
    await act(async () =>
      root.render(
        <IssuesLive
          view={views.lesson}
          at="lesson"
          initial={{ kind: 'visitor', rows: visitorRows }}
          fixes={{ kind: 'failed' }}
        />,
      ),
    );
    await flush();
    const boxes = $$('[data-issues-box="failed"]');
    expect(boxes).toHaveLength(2);
    fetchMock.mockReturnValueOnce(answer({ state: 'ok', list: personalList(), reads }));
    await act(async () => (boxes[0].querySelector('button') as HTMLButtonElement).click());
    await flush();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/me/learn/issues?lesson=find-duplicates-with-a-set',
      '/api/me/learn/issues?lesson=find-duplicates-with-a-set',
    ]);
    expect(router.refresh).toHaveBeenCalledTimes(1);
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
