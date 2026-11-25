// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { IssuesView } from '@/lib/learn/issues';

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/learn/lessons/find-duplicates-with-a-set/real-world',
}));
vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));
const { setLearnIssuesEmailAction, setLearnLessonIssuesEmailAction } = vi.hoisted(() => ({
  setLearnIssuesEmailAction: vi.fn(),
  setLearnLessonIssuesEmailAction: vi.fn(),
}));
vi.mock('@/lib/learn/issues.actions', () => ({
  setLearnIssuesEmailAction,
  setLearnLessonIssuesEmailAction,
  readMoreLearnFixes: vi.fn(),
}));
const { signIn } = vi.hoisted(() => ({ signIn: vi.fn(async () => undefined) }));
vi.mock('next-auth/react', () => ({ signIn }));
const hint = vi.hoisted(() => ({ present: true }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { IssuesLive } = await import('./issues-live');
const { issuesNames, learnFixes, listNone, views } = await import('@/lib/learn/__fixtures__/issues');
const { LESSON_ISSUES_EMAIL_LINE } = await import('@/lib/learn/lesson-issues-email');

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

const LESSON = 'find-duplicates-with-a-set';
/** Where a visitor and a person without the Learn sign go: Learn's onboarding, back to this view. */
const THROUGH_SETUP = `/learn/setup?back=${encodeURIComponent(`/learn/lessons/${LESSON}/real-world`)}`;

const fetchMock = vi.fn();
let container: HTMLDivElement;
let root: Root;

const answer = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
const reads = { looks: null, numbers: null };

/** The person's route answering their list for the lesson, with the Learn sign; the passed walkthroughs, none. */
const mine = (list: ReturnType<typeof listNone>, learnOnboarded: boolean | null = true) =>
  fetchMock.mockImplementation((url: string) =>
    url.endsWith('/walkthroughs') ? answer({ walkthroughs: [] }) : answer({ state: 'ok', list, reads, learnOnboarded }),
  );

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  fetchMock.mockReset();
  setLearnLessonIssuesEmailAction.mockReset();
  signIn.mockClear();
  vi.stubGlobal('fetch', fetchMock);
  hint.present = true;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const $ = (selector: string) => container.querySelector<HTMLElement>(selector);
const box = () => $('[data-real-projects-end="open-none"] [data-lesson-issues-email]');
const stateOf = () => box()?.getAttribute('data-lesson-issues-email');
/** The spot the button and what takes its place share. */
const place = () => box()?.firstElementChild as HTMLElement | null;
const flush = () => act(async () => {});

/** A lesson with no open issue at all, and merged fixes: the box with the email in the "Open" group. */
const draw = async (view: IssuesView = views.lesson, at: 'lesson' | 'course' = 'lesson') => {
  await act(async () =>
    root.render(
      <IssuesLive
        view={view}
        at={at}
        names={issuesNames}
        initial={{ kind: 'visitor', rows: [] }}
        fixes={{ kind: 'fixed', fixes: learnFixes }}
      />,
    ),
  );
  await flush();
};

describe('"Email me issues for my lessons" on a lesson\'s view', () => {
  it("a visitor presses the button and signs in through Learn's onboarding, back to this view", async () => {
    hint.present = false;
    await draw();
    expect(stateOf()).toBe('visitor');
    expect(place()?.textContent).toBe('Email me issues for my lessons');
    expect(box()?.textContent).toContain(LESSON_ISSUES_EMAIL_LINE);
    await act(async () => place()?.querySelector('button')?.click());
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: THROUGH_SETUP });
    expect(setLearnLessonIssuesEmailAction).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a person without the Learn sign goes the same way, by a link', async () => {
    mine(listNone(), false);
    await draw();
    expect(stateOf()).toBe('setup');
    const link = place()?.querySelector('a');
    expect(link?.textContent).toBe('Email me issues for my lessons');
    expect(link?.getAttribute('href')).toBe(THROUGH_SETUP);
  });

  it('back on the view with the sign, the button waits for a press: nothing is turned on by itself', async () => {
    mine(listNone());
    await draw();
    expect(stateOf()).toBe('off');
    expect(setLearnLessonIssuesEmailAction).not.toHaveBeenCalled();
  });

  it("while the person's own read is out, the button stands in its place and waits", async () => {
    let land: (res: Response) => void = () => {};
    fetchMock.mockImplementation((url: string) =>
      url.endsWith('/walkthroughs')
        ? answer({ walkthroughs: [] })
        : new Promise<Response>((resolve) => {
            land = resolve;
          }),
    );
    await draw();
    expect(stateOf()).toBe('unread');
    const button = place()?.querySelector('button');
    expect(button?.getAttribute('aria-disabled')).toBe('true');
    await act(async () => button?.click());
    expect(signIn).not.toHaveBeenCalled();
    expect(setLearnLessonIssuesEmailAction).not.toHaveBeenCalled();
    await act(async () =>
      land(new Response(JSON.stringify({ state: 'ok', list: listNone(), reads, learnOnboarded: true }))),
    );
    await flush();
    expect(stateOf()).toBe('off');
  });

  it("one press turns it on with this lesson; the line takes the button's place, and nothing moves", async () => {
    mine(listNone());
    await draw();
    const spot = place();
    setLearnLessonIssuesEmailAction.mockResolvedValueOnce({
      ok: true,
      data: { lessonIssues: true, lessonIssuesAsked: [LESSON] },
    });
    await act(async () => spot?.querySelector('button')?.click());
    await flush();
    expect(setLearnLessonIssuesEmailAction).toHaveBeenCalledWith(true, LESSON);
    expect(stateOf()).toBe('on');
    // The same spot, the line under it unchanged.
    expect(place()).toBe(spot);
    expect(place()?.textContent).toBe('We’ll email you at y***@example.com when one appears.Turn off');
    expect(box()?.textContent).toContain(LESSON_ISSUES_EMAIL_LINE);
    // The focus moves to the control now drawn.
    expect(document.activeElement?.textContent).toBe('Turn off');
  });

  it('on and covering the lesson: "Turn off" turns the whole switch off, as Settings does', async () => {
    mine(listNone({ lessonIssues: true, lessonIssuesCovered: true }));
    await draw();
    expect(stateOf()).toBe('on');
    setLearnLessonIssuesEmailAction.mockResolvedValueOnce({
      ok: true,
      data: { lessonIssues: false, lessonIssuesAsked: [LESSON] },
    });
    await act(async () => $('[data-lesson-issues-turn-off]')?.click());
    await flush();
    expect(setLearnLessonIssuesEmailAction).toHaveBeenCalledWith(false, null);
    expect(stateOf()).toBe('off');
  });

  it('on but not covering this lesson: the button, never "on" for a lesson the email skips', async () => {
    mine(listNone({ lessonIssues: true, lessonIssuesCovered: false }));
    await draw();
    expect(stateOf()).toBe('off');
  });

  it('on with no address: says the email needs one, with "Turn off"', async () => {
    mine(listNone({ lessonIssues: true, lessonIssuesCovered: true, emailTo: null }));
    await draw();
    expect(stateOf()).toBe('no-address');
    expect(place()?.textContent).toContain('This email needs an address, and we have none for you.');
    expect($('[data-lesson-issues-turn-off]')).not.toBeNull();
  });

  it('a failed save says why under the box and changes nothing', async () => {
    mine(listNone());
    await draw();
    setLearnLessonIssuesEmailAction.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await act(async () => place()?.querySelector('button')?.click());
    await flush();
    expect(stateOf()).toBe('off');
    expect(box()?.querySelector('[role="alert"]')?.textContent).toBe(
      'We could not save just now. Try again in a minute.',
    );
    setLearnLessonIssuesEmailAction.mockRejectedValueOnce(new Error('down'));
    await act(async () => place()?.querySelector('button')?.click());
    await flush();
    expect(stateOf()).toBe('off');
    setLearnLessonIssuesEmailAction.mockResolvedValueOnce({ ok: true, data: null });
    await act(async () => place()?.querySelector('button')?.click());
    await flush();
    expect(box()?.querySelector('[role="alert"]')?.textContent).toBe('Nothing was saved. Try again in a minute.');
  });

  it('waits while the list is read again for a new view, and keeps a failure to the view it was made on', async () => {
    mine(listNone({ lessonIssues: true, lessonIssuesCovered: true }));
    await draw();
    expect(stateOf()).toBe('on');
    setLearnLessonIssuesEmailAction.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await act(async () => $('[data-lesson-issues-turn-off]')?.click());
    await flush();
    expect(box()?.querySelector('[role="alert"]')).not.toBeNull();

    // A switch changes the view: the last view's answer is not this one's, so the button waits.
    let land: (res: Response) => void = () => {};
    fetchMock.mockImplementation((url: string) =>
      url.endsWith('/walkthroughs')
        ? answer({ walkthroughs: [] })
        : new Promise<Response>((resolve) => {
            land = resolve;
          }),
    );
    await draw({ ...views.lesson, learned: true });
    expect(stateOf()).toBe('unread');
    await act(async () => place()?.querySelector('button')?.click());
    expect(setLearnLessonIssuesEmailAction).toHaveBeenCalledTimes(1);
    await act(async () =>
      land(new Response(JSON.stringify({ state: 'ok', list: listNone(), reads, learnOnboarded: true }))),
    );
    await flush();
    expect(stateOf()).toBe('off');
    expect(box()?.querySelector('[role="alert"]')).toBeNull();
  });

  it("is a lesson's alone: a course's empty box has no button", async () => {
    mine(listNone());
    await draw({ ...views.course, learned: false, show: 'both' }, 'course');
    expect($('[data-real-projects-end="open-none"]')).not.toBeNull();
    expect($('[data-lesson-issues-email]')).toBeNull();
  });
});
