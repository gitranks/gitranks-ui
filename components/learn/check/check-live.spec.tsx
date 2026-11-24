// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hint, push, signIn, answerLearnCheckAction, stopLearnCheckAction, saveLearnKnownAction } = vi.hoisted(() => ({
  hint: { present: false },
  push: vi.fn(),
  signIn: vi.fn(async () => undefined),
  answerLearnCheckAction: vi.fn(),
  stopLearnCheckAction: vi.fn(),
  saveLearnKnownAction: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next-auth/react', () => ({ signIn }));
vi.mock('@/lib/learn/check.actions', () => ({ answerLearnCheckAction, stopLearnCheckAction, saveLearnKnownAction }));
// The session's hint cookie, as the browser holds it.
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));
const { startLearnSetupGuessAction } = vi.hoisted(() => ({
  startLearnSetupGuessAction: vi.fn(async () => ({ ok: true as const, data: 'WORKING' as const })),
}));
// Our guess of the person's setup, which every Learn page a signed-in person opens starts.
vi.mock('@/lib/learn/setup.actions', () => ({ startLearnSetupGuessAction }));

const { CheckLive, readCheckSide, readKnownSide } = await import('./check-live');
const { forgetLearnSetupGuessStart } = await import('@/lib/learn/use-setup-guess');
const {
  checkEnded,
  checkResult,
  checkResultAll,
  checkResultNone,
  checkResultOf,
  checkResultStopped,
  checkRunOf,
  knownSinceMine,
} = await import('@/lib/learn/__fixtures__/check');
const { algorithmsCourse, algorithmsCoursePaused, lessonAt, progressMine } = await import(
  '@/lib/learn/__fixtures__/course'
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  startLearnSetupGuessAction.mockClear();
  forgetLearnSetupGuessStart();
});

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();
/** The check's route: one body after another, then the last one again. */
let runs: unknown[] = [];
let lastRun: unknown = null;
/** The course's personal side ("What you know", and the marks a result does not show): none marked by default. */
let mine: unknown = null;
const MINE_PATH = '/api/me/learn/courses/';
/** What the routes answer: a body with `course` is the course's personal side; the others, the check's, in turn. */
const answer = (...bodies: unknown[]) => {
  for (const body of bodies) {
    if (body && typeof body === 'object' && 'course' in body) mine = body;
    else {
      runs.push(body);
      lastRun = body;
    }
  }
};
/** How many times the check's route was read. */
const checkReads = () => fetchMock.mock.calls.filter(([url]) => !String(url).startsWith(MINE_PATH)).length;

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  runs = [];
  lastRun = null;
  mine = { course: { ...progressMine, lessons: [] } };
  fetchMock.mockImplementation(async (url: string) => {
    const body = url.startsWith(MINE_PATH) ? mine : runs.length ? runs.shift() : lastRun;
    return new Response(JSON.stringify(body), { status: 200 });
  });
  for (const mock of [push, signIn, answerLearnCheckAction, stopLearnCheckAction, saveLearnKnownAction]) {
    mock.mockReset();
  }
  signIn.mockResolvedValue(undefined);
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  hint.present = false;
  vi.unstubAllGlobals();
});

const draw = (mode: 'check' | 'known' = 'check', course = algorithmsCourse) =>
  act(async () => {
    root.render(<CheckLive course={course} mode={mode} />);
  });
const $ = (selector: string) => host.querySelector<HTMLElement>(selector);
const state = () => $('[data-check-state]')?.dataset.checkState ?? null;
const title = () => $('h1:not(.sr-only)')?.textContent ?? '';
const main = () => $('[data-answer-main]')!;
const option = (index: number) => $(`[data-option="${index}"] input`)!;
/** An option's input, to read whether it is picked or can be picked. */
const input = (index: number) => option(index) as HTMLInputElement;
const extra = () => $('[data-option="extra"] input')!;
const buttonOf = (text: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === text);
const groupBox = (slug: string) => $(`[data-known-group="${slug}"] [role="checkbox"]`)!;
const cardTitle = () => $('[data-known-title]')!.textContent;
const click = (element: HTMLElement) =>
  act(async () => {
    element.click();
  });
const key = (target: EventTarget, name: string) =>
  act(async () => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
  });

describe('the check, for a visitor', () => {
  it('asks for nothing, says what the check does, and signs in back to it', async () => {
    await draw();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(state()).toBe('visitor');
    expect(title()).toBe('The check needs an account');
    expect(host.textContent).toContain('one question for each of the 9 groups in Algorithms and data structures');
    expect(document.activeElement).toBe($('h1'));
    await click(buttonOf('Sign in with GitHub')!);
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: '/learn/check/algorithms' });
  });

  it('signs in back to "What you know" from there', async () => {
    await draw('known');
    expect(title()).toBe('What you know needs an account');
    await click(buttonOf('Sign in with GitHub')!);
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: '/learn/check/algorithms?known' });
  });
});

describe('the check, for a person with a session', () => {
  beforeEach(() => {
    hint.present = true;
  });

  it('holds the card’s place while the run is on its way, and never asks to sign in', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    await draw();
    expect(state()).toBe('pending');
    expect($('[aria-busy]')).toBeNull();
    expect($('[data-check-state="pending"] [role="status"]')!.textContent).toBe('Loading your check…');
    expect(buttonOf('Sign in with GitHub')).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/check/algorithms', { cache: 'no-store' });
  });

  it('says a run that did not come did not load, and reads it again', async () => {
    answer({ check: null, missing: false });
    await draw();
    expect(state()).toBe('failed');
    expect(title()).toBe('Your check did not load');
    answer({ check: checkEnded(), missing: false });
    await click(buttonOf('Try again')!);
    expect(state()).toBe('result');
  });

  it('says when the course has no check just now, with the way back to it', async () => {
    answer({ check: null, missing: true });
    await draw();
    expect(state()).toBe('missing');
    expect($('[data-check-state="missing"] a')!.getAttribute('href')).toBe('/learn/courses/algorithms');
  });

  it('says a course offers no check without asking, to a visitor too, and "What you know" still opens', async () => {
    const closed = { ...algorithmsCourse, checkOffered: false };
    for (const present of [true, false]) {
      hint.present = present;
      act(() => root.unmount());
      root = createRoot(host);
      await draw('check', closed);
      expect(state()).toBe('missing');
      expect(fetchMock).not.toHaveBeenCalled();
    }
    hint.present = true;
    answer({ course: { ...progressMine, lessons: knownSinceMine.lessons } });
    act(() => root.unmount());
    root = createRoot(host);
    await draw('known', closed);
    expect(state()).toBe('known');
  });

  it('says plainly when the check is withdrawn during the run, and leads to the course, not to try again', async () => {
    for (const how of ['answer', 'stop'] as const) {
      act(() => root.unmount());
      root = createRoot(host);
      answer({ check: checkRunOf(3), missing: false });
      await draw();
      if (how === 'answer') {
        answerLearnCheckAction.mockResolvedValueOnce({ ok: false, error: 'NOT_FOUND' });
        await click(option(0));
        await click(main());
      } else {
        stopLearnCheckAction.mockResolvedValueOnce({ ok: false, error: 'NOT_FOUND' });
        await click($('[data-check-stop]')!);
      }
      expect(state(), how).toBe('missing');
      expect(title()).toBe('This course has no check just now');
      expect($('[data-check-state="missing"] a')!.getAttribute('href')).toBe('/learn/courses/algorithms');
      expect(buttonOf('Try again')).toBeUndefined();
    }
  });

  it('takes no answer once "Stop and see the result" is pressed, and a late refusal keeps the ticks', async () => {
    answer({ check: checkRunOf(3), missing: false });
    await draw();
    // An answer on its way when the person stops.
    let refuse: (value: unknown) => void = () => {};
    answerLearnCheckAction.mockReturnValueOnce(new Promise((resolve) => (refuse = resolve)));
    await click(option(0));
    await click(main());
    let end: (value: unknown) => void = () => {};
    stopLearnCheckAction.mockReturnValueOnce(new Promise((resolve) => (end = resolve)));
    await click($('[data-check-stop]')!);
    // While it stops: no keys, no presses.
    await key(document.body, '2');
    await key(document.body, 'Enter');
    await click(main());
    expect(answerLearnCheckAction).toHaveBeenCalledTimes(1);
    await act(async () => end({ ok: true, data: checkEnded() }));
    expect(state()).toBe('result');
    await click(groupBox('big-o'));
    expect(cardTitle()).toBe('31 of 86 lessons marked as known');
    await act(async () => refuse({ ok: false, error: 'CONFLICT' }));
    expect(checkReads()).toBe(1);
    expect(cardTitle()).toBe('31 of 86 lessons marked as known');
  });

  it('takes only a whole run from the route', async () => {
    for (const body of [{}, { check: { id: 1 } }, { check: { id: 'r', questions: 'no' } }]) {
      answer(body);
      expect(await readCheckSide('algorithms')).toBeNull();
    }
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 500 }));
    expect(await readCheckSide('algorithms')).toBeNull();
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect(await readCheckSide('algorithms')).toBeNull();
    answer({ course: { ...progressMine, slug: 'go' } });
    expect(await readKnownSide('algorithms')).toBeNull();
  });

  it('goes on from the first question not answered, with no right or wrong', async () => {
    answer({ check: checkRunOf(2), missing: false });
    await draw();
    expect(host.textContent).toContain('Question 3 of 9');
    expect(host.textContent).toContain('About Hash maps and sets');
    answerLearnCheckAction.mockResolvedValue({ ok: true, data: true });
    await click(option(1));
    await click(main());
    expect(answerLearnCheckAction).toHaveBeenCalledWith({
      course: 'algorithms',
      group: 'hash-maps-and-sets',
      picked: 1,
      dontKnow: false,
      language: 'python',
    });
    expect(host.textContent).not.toMatch(/Right\.|Not quite\./);
    expect(host.textContent).toContain('Question 4 of 9');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Question 4 of 9');
  });

  it('answers questions in a row: each one opens fresh, by mouse and by keyboard, though every id is the same', async () => {
    answer({ check: checkRunOf(0), missing: false });
    await draw();
    answerLearnCheckAction.mockResolvedValue({ ok: true, data: true });
    // The first question, by mouse.
    await click(option(1));
    await click(main());
    expect(host.textContent).toContain('Question 2 of 9');
    // The second one is open: nothing picked, every option can be picked, and a pick is sent with its own group.
    expect(input(0).checked).toBe(false);
    expect(input(1).checked).toBe(false);
    expect(input(0).disabled).toBe(false);
    expect(input(1).disabled).toBe(false);
    await click(option(0));
    expect(input(0).checked).toBe(true);
    await click(main());
    expect(answerLearnCheckAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ group: 'arrays-and-strings', picked: 0 }),
    );
    expect(host.textContent).toContain('Question 3 of 9');
    // The third one, by keyboard.
    expect(input(1).disabled).toBe(false);
    await key(document.body, '2');
    expect(input(1).checked).toBe(true);
    await key(document.body, 'Enter');
    expect(answerLearnCheckAction).toHaveBeenLastCalledWith(
      expect.objectContaining({ group: 'hash-maps-and-sets', picked: 1 }),
    );
    expect(answerLearnCheckAction).toHaveBeenCalledTimes(3);
    expect(host.textContent).toContain('Question 4 of 9');
  });

  it('sends "I don’t know" with no pick, after saying it is a fine answer', async () => {
    answer({ check: checkRunOf(0), missing: false });
    await draw();
    answerLearnCheckAction.mockResolvedValue({ ok: true, data: true });
    await click(extra());
    expect(host.textContent).toContain('That is a fine answer.');
    await click(main());
    expect(answerLearnCheckAction).toHaveBeenCalledWith(
      expect.objectContaining({ group: 'big-o', picked: null, dontKnow: true }),
    );
  });

  it('keeps the card when an answer is not sent, and reads the run again when it came twice', async () => {
    answer({ check: checkRunOf(0), missing: false });
    await draw();
    answerLearnCheckAction.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await click(option(0));
    await click(main());
    expect(host.textContent).toContain('Not sent.');
    answerLearnCheckAction.mockResolvedValueOnce({ ok: false, error: 'CONFLICT' });
    answer({ check: checkRunOf(1), missing: false });
    await click(main());
    expect(checkReads()).toBe(2);
    expect(host.textContent).toContain('Question 2 of 9');
  });

  it('reads the result once the last question is answered', async () => {
    answer({ check: checkRunOf(8), missing: false }, { check: checkEnded(), missing: false });
    await draw();
    expect(main().textContent).toContain('See the result');
    answerLearnCheckAction.mockResolvedValue({ ok: true, data: true });
    await click(option(0));
    await click(main());
    expect(state()).toBe('result');
    expect(title()).toBe('You already know 4 of the 9 groups');
    expect(host.textContent).toContain('9 of 9 answered');
  });

  it('"Stop and see the result" ends the run and shows it; a stop that fails says so', async () => {
    answer({ check: checkRunOf(3), missing: false });
    await draw();
    stopLearnCheckAction.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await click($('[data-check-stop]')!);
    expect($('[data-check-stop-failed]')!.getAttribute('role')).toBe('alert');
    stopLearnCheckAction.mockResolvedValueOnce({ ok: true, data: checkEnded() });
    await click($('[data-check-stop]')!);
    expect(stopLearnCheckAction).toHaveBeenCalledWith('algorithms');
    expect(state()).toBe('result');
  });

  it('reads the run again when it ended elsewhere', async () => {
    answer({ check: checkRunOf(3), missing: false }, { check: checkEnded(), missing: false });
    await draw();
    stopLearnCheckAction.mockResolvedValueOnce({ ok: false, error: 'CONFLICT' });
    await click($('[data-check-stop]')!);
    expect(state()).toBe('result');
  });

  it('ends a run with nothing left to ask that has not ended, once', async () => {
    answer({ check: checkRunOf(9), missing: false });
    stopLearnCheckAction.mockResolvedValueOnce({ ok: true, data: checkEnded() });
    await draw();
    expect(stopLearnCheckAction).toHaveBeenCalledTimes(1);
    expect(state()).toBe('result');
  });

  it('says so when such a run cannot be ended, and never asks again by itself', async () => {
    answer({ check: checkRunOf(9), missing: false });
    stopLearnCheckAction.mockResolvedValue({ ok: false, error: 'CONFLICT' });
    await draw();
    expect(title()).toBe('Your result did not load');
    expect(stopLearnCheckAction).toHaveBeenCalledTimes(1);
    expect(checkReads()).toBe(1);
  });
});

describe('the check’s result', () => {
  beforeEach(() => {
    hint.present = true;
  });

  it('proposes the right groups; ticking changes the card in place, and says what the person changed', async () => {
    answer({ check: checkEnded(), missing: false });
    await draw();
    expect(document.activeElement).toBe($('h1'));
    expect(cardTitle()).toBe('39 of 86 lessons marked as known');
    expect($('[data-known-group="big-o"]')!.dataset.box).toBe('on');
    expect($('[data-known-group="big-o"]')!.textContent).toContain('You answered right');
    await click(groupBox('big-o'));
    expect(cardTitle()).toBe('31 of 86 lessons marked as known');
    expect($('[data-known-start]')!.textContent).toContain(lessonAt('1-1').title);
    expect($('[data-known-start]')!.textContent).toContain('You unticked 8 lessons yourself.');
    await click(groupBox('big-o'));
    expect(cardTitle()).toBe('39 of 86 lessons marked as known');
  });

  it('opens a group to tick single lessons, and Esc closes it, back on its button', async () => {
    answer({ check: checkEnded(), missing: false });
    await draw();
    const toggle = $('[aria-label="Show the lessons of Hash maps and sets"]')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await click(toggle);
    const lessons = $('[aria-label="The lessons of Hash maps and sets"]')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe('Hide the lessons of Hash maps and sets');
    await click(lessons.querySelector<HTMLElement>('[role="checkbox"]')!);
    expect($('[data-known-group="hash-maps-and-sets"]')!.dataset.box).toBe('mixed');
    expect($('[data-known-group="hash-maps-and-sets"] [data-group-words]')!.textContent).toBe('8 of 9 marked as known');
    await key(lessons.querySelector('[role="checkbox"]')!, 'Escape');
    expect($('[aria-label="The lessons of Hash maps and sets"]')).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });

  it('saves the ticked lessons with the run and goes where the person starts; Enter does the same', async () => {
    answer({ check: checkEnded(), missing: false });
    await draw();
    const start = { slug: lessonAt('4-1').slug, title: lessonAt('4-1').title };
    saveLearnKnownAction.mockResolvedValue({ ok: true, data: { start, known: 39 } });
    await key(document.body, 'Enter');
    const [{ course, known, check }] = saveLearnKnownAction.mock.calls[0];
    expect({ course, check, known: known.length }).toEqual({ course: 'algorithms', check: 'run-1', known: 39 });
    expect(push).toHaveBeenCalledWith(`/learn/lessons/${start.slug}`);
    // On its way: the button waits, and Enter asks nothing twice.
    expect($('[data-known-primary]')!.textContent).toBe('Saving…');
    await key(document.body, 'Enter');
    expect(saveLearnKnownAction).toHaveBeenCalledTimes(1);
  });

  it('keeps a paused lesson marked as known after saving the result, with the marks it does not show', async () => {
    const lessons = knownSinceMine.lessons.map((mark) =>
      mark.slug === 'find-duplicates-with-a-set' ? { ...mark, depth: 'NONE' as const, known: true } : mark,
    );
    // The result leaves the paused lesson out.
    const result = checkResult.map((group) => ({
      ...group,
      lessons: group.lessons.filter((lesson) => lesson.slug !== 'find-duplicates-with-a-set'),
    }));
    for (const how of ['read', 'stop'] as const) {
      act(() => root.unmount());
      root = createRoot(host);
      saveLearnKnownAction.mockReset();
      runs = [];
      answer(
        how === 'read' ? { check: checkEnded(result), missing: false } : { check: checkRunOf(3), missing: false },
        { course: { ...progressMine, lessons } },
      );
      stopLearnCheckAction.mockResolvedValueOnce({ ok: true, data: checkEnded(result) });
      await draw('check', algorithmsCoursePaused);
      if (how === 'stop') await click($('[data-check-stop]')!);
      expect(state(), how).toBe('result');
      expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/courses/algorithms', { cache: 'no-store' });
      // The first save fails, so the page takes the second press.
      saveLearnKnownAction.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
      await click($('[data-known-primary]')!);
      expect(saveLearnKnownAction.mock.calls[0][0].known, how).toContain('find-duplicates-with-a-set');
      // Marking nothing keeps it too: only what the person could see changes.
      saveLearnKnownAction.mockResolvedValueOnce({ ok: true, data: { start: null, known: 1 } });
      await click($('[data-known-secondary]')!);
      expect(saveLearnKnownAction.mock.calls[1][0].known, how).toEqual(['find-duplicates-with-a-set']);
    }
  });

  it("draws no result it could not save safely: without the person's marks it says it did not load", async () => {
    answer({ check: checkEnded(), missing: false }, { course: null });
    await draw();
    expect(state()).toBe('failed');
    expect(title()).toBe('Your check did not load');
    answer({ course: { ...progressMine, lessons: [] } });
    await click(buttonOf('Try again')!);
    expect(state()).toBe('result');
  });

  it('a run stopped before any answer: the strip says so with no zero, and nothing is marked', async () => {
    answer({ check: checkEnded(checkResultOf([])), missing: false });
    await draw();
    expect(state()).toBe('result');
    expect($('[data-player-run]')!.textContent).toBe('Stopped before the first of 9 questions');
    expect(cardTitle()).toBe('Nothing is marked as known');
    expect($('[data-known-group="big-o"]')!.textContent).toContain('Not answered');
    expect(host.textContent).not.toMatch(/\b0\b/);
  });

  it('a run stopped after three answers: how many were answered, the rest not answered', async () => {
    answer({ check: checkEnded(checkResultStopped), missing: false });
    await draw();
    expect($('[data-player-run]')!.textContent).toBe('3 of 9 answered');
    expect($('[data-known-group="stacks-and-queues"]')!.textContent).toContain('Not answered');
    expect(cardTitle()).toBe('8 of 86 lessons marked as known');
  });

  it('names the first lesson not learned when marking nothing does not start at lesson 1', async () => {
    const result = checkResultOf(['WRONG', 'RIGHT']).map((group, at) =>
      at === 0 ? { ...group, lessons: group.lessons.map((lesson) => ({ ...lesson, learned: true })) } : group,
    );
    answer({ check: checkEnded(result), missing: false });
    await draw();
    const first = lessonAt('2-1');
    expect($('[data-known-secondary]')!.textContent).toBe(`Mark nothing and start at ${first.title}`);
    saveLearnKnownAction.mockResolvedValue({ ok: true, data: { start: null, known: 0 } });
    await click($('[data-known-secondary]')!);
    expect(saveLearnKnownAction).toHaveBeenCalledWith({ course: 'algorithms', known: [], check: 'run-1' });
    expect(push).toHaveBeenCalledWith(`/learn/lessons/${first.slug}`);
  });

  it('"Mark nothing and start at lesson 1" saves no marks and goes to the first lesson', async () => {
    answer({ check: checkEnded(), missing: false });
    await draw();
    saveLearnKnownAction.mockResolvedValue({ ok: true, data: { start: null, known: 0 } });
    await click($('[data-known-secondary]')!);
    expect(saveLearnKnownAction).toHaveBeenCalledWith({ course: 'algorithms', known: [], check: 'run-1' });
    expect(push).toHaveBeenCalledWith(`/learn/lessons/${lessonAt('1-1').slug}`);
  });

  it('says a save that failed, keeps the sheet, and reads again when the result was saved elsewhere', async () => {
    answer({ check: checkEnded(), missing: false });
    await draw();
    saveLearnKnownAction.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await click($('[data-known-primary]')!);
    expect($('[data-known-failed]')!.getAttribute('role')).toBe('alert');
    expect(push).not.toHaveBeenCalled();
    saveLearnKnownAction.mockResolvedValueOnce({ ok: false, error: 'CONFLICT' });
    await click($('[data-known-primary]')!);
    expect(checkReads()).toBe(2);
  });

  it('with nothing right: nothing marked, and the first lesson', async () => {
    answer({ check: checkEnded(checkResultNone), missing: false });
    await draw();
    expect(title()).toBe('We found nothing you already know');
    expect(cardTitle()).toBe('Nothing is marked as known');
    expect($('[data-known-start]')!.textContent).toContain('the first lesson of the course.');
    expect($('[data-known-primary]')!.textContent).toContain('Start at the first lesson');
    expect($('[data-known-secondary]')).toBeNull();
    expect(host.textContent).not.toMatch(/\b0 /);
  });

  it('with every answer right: no lesson left to start at, and another course', async () => {
    answer({ check: checkEnded(checkResultAll), missing: false });
    await draw();
    expect(title()).toBe('You already know all 9 groups');
    expect(cardTitle()).toBe('All 86 lessons marked as known');
    expect($('[data-known-start]')!.textContent).toBe('There is no lesson left to start at.');
    saveLearnKnownAction.mockResolvedValue({ ok: true, data: { start: null, known: 86 } });
    await click($('[data-known-primary]')!);
    expect(push).toHaveBeenCalledWith('/learn/courses');
  });
});

describe('"What you know"', () => {
  beforeEach(() => {
    hint.present = true;
  });

  it('reads the person’s marks, shows learned lessons as learned, and saves with no run', async () => {
    answer({ course: { ...progressMine, lessons: knownSinceMine.lessons } });
    await draw('known');
    expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/courses/algorithms', { cache: 'no-store' });
    expect(state()).toBe('known');
    expect(title()).toBe('What you already know in this course');
    expect(host.textContent).toContain('What you know');
    expect(cardTitle()).toBe('26 of 86 lessons marked as known');
    expect($('[data-known-group="hash-maps-and-sets"] [data-group-words]')!.textContent).toBe(
      '6 of 9 marked as known · 3 learned',
    );
    expect($('[data-known-start]')!.textContent).not.toContain('yourself');
    saveLearnKnownAction.mockResolvedValue({ ok: true, data: { start: null, known: 26 } });
    await click($('[data-known-primary]')!);
    expect(saveLearnKnownAction.mock.calls[0][0]).toMatchObject({ course: 'algorithms', check: null });
    expect(saveLearnKnownAction.mock.calls[0][0].known).toHaveLength(26);
    expect(push).toHaveBeenCalledWith('/learn/courses/algorithms');
  });

  it('says marks that did not come did not load', async () => {
    answer({ course: null });
    await draw('known');
    expect(title()).toBe('What you know did not load');
  });

  it('keeps the marks of paused lessons it does not show: a save with no change changes nothing', async () => {
    const lessons = knownSinceMine.lessons.map((mark) =>
      mark.slug === 'find-duplicates-with-a-set' ? { ...mark, depth: 'NONE' as const, known: true } : mark,
    );
    answer({ course: { ...progressMine, lessons } });
    await draw('known', algorithmsCoursePaused);
    expect(host.textContent).not.toContain('Find duplicates in one pass with a set');
    saveLearnKnownAction.mockResolvedValue({ ok: true, data: { start: null, known: 27 } });
    await key(document.body, 'Enter');
    const { known } = saveLearnKnownAction.mock.calls[0][0];
    expect(known).toContain('find-duplicates-with-a-set');
    expect([...known].sort()).toEqual(
      lessons
        .filter((mark) => mark.known)
        .map((mark) => mark.slug)
        .sort(),
    );
  });

  it('says a save that failed, keeps the marks, and saves them on the next press', async () => {
    answer({ course: { ...progressMine, lessons: knownSinceMine.lessons } });
    await draw('known');
    await click(groupBox('big-o'));
    expect(cardTitle()).toBe('18 of 86 lessons marked as known');
    saveLearnKnownAction.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await click($('[data-known-primary]')!);
    expect($('[data-known-failed]')!.getAttribute('role')).toBe('alert');
    expect($('[data-known-failed]')!.textContent).toContain('Not saved.');
    expect($('[data-known-primary]')!.textContent).toBe('Save');
    expect(cardTitle()).toBe('18 of 86 lessons marked as known');
    expect(push).not.toHaveBeenCalled();
    saveLearnKnownAction.mockResolvedValueOnce({ ok: true, data: { start: null, known: 18 } });
    await click($('[data-known-primary]')!);
    expect(saveLearnKnownAction.mock.calls[1][0].known).toHaveLength(18);
    expect($('[data-known-failed]')).toBeNull();
    expect(push).toHaveBeenCalledWith('/learn/courses/algorithms');
  });
});

describe('our guess of the setup, from the check', () => {
  it('is never started for a visitor', async () => {
    await draw();
    expect(startLearnSetupGuessAction).not.toHaveBeenCalled();
  });

  it('is started once for a person with a session, and the check never waits for it', async () => {
    hint.present = true;
    startLearnSetupGuessAction.mockImplementation(() => new Promise(() => {}));
    await draw();
    await draw();
    expect(startLearnSetupGuessAction).toHaveBeenCalledTimes(1);
    expect(checkReads()).toBeGreaterThan(0);
  });
});
