// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hint, push, signIn, answerLearnLessonAction, sendLearnFeedbackAction } = vi.hoisted(() => ({
  hint: { present: false },
  push: vi.fn(),
  signIn: vi.fn(async () => undefined),
  answerLearnLessonAction: vi.fn(),
  sendLearnFeedbackAction: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));

vi.mock('next-auth/react', () => ({ signIn }));
vi.mock('@/lib/learn/lesson-page.actions', () => ({ answerLearnLessonAction, sendLearnFeedbackAction }));
// The session's hint cookie, as the browser holds it.
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));
const { startLearnSetupGuessAction } = vi.hoisted(() => ({
  startLearnSetupGuessAction: vi.fn(async () => ({ ok: true as const, data: 'WORKING' as const })),
}));
// Our guess of the person's setup, which every Learn page a signed-in person opens starts.
vi.mock('@/lib/learn/setup.actions', () => ({ startLearnSetupGuessAction }));

const { LessonLive } = await import('./lesson-live');
const { forgetLearnSetupGuessStart } = await import('@/lib/learn/use-setup-guess');
const {
  mineLearned,
  mineLearnedRated,
  mineNew,
  setDepths,
  setDepthsLast,
  setGroup,
  setGroupLast,
  setLesson,
  setLessonLast,
} = await import('@/lib/learn/__fixtures__/lesson-page');
const { NO_LESSON_REAL } = await import('@/lib/learn/real-issues');
const { ANSWER_KEPT_NOTE, KEPT_ANSWER_KEY, readKeptAnswer, writeKeptAnswer } = await import('@/lib/learn/kept-answer');
/** The lesson, through Learn's onboarding. */
const throughSetup = `/learn/setup?back=${encodeURIComponent(`/learn/lessons/${setLesson.slug}`)}`;
const { learnFixes } = await import('@/lib/learn/__fixtures__/issues');
const { lessonRealIssues, lessonRealWithFix } = await import('@/lib/learn/__fixtures__/real-issues');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  startLearnSetupGuessAction.mockClear();
  forgetLearnSetupGuessStart();
});

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();

/**
 * What the person's routes answer: their side of the lesson, each lesson's depth in the course, and what "In the real
 * world" adds (by default nothing, as an API without it answers).
 */
function routes(
  mine: unknown,
  depths: Record<string, string> = setDepths,
  real: unknown = NO_LESSON_REAL,
  learnOnboarded: boolean | null = true,
) {
  fetchMock.mockImplementation(async (path: string) => {
    const body = path.endsWith('/real-world')
      ? real
      : path.startsWith('/api/me/learn/lessons/')
        ? { mine, learnOnboarded }
        : { course: { slug: 'algorithms', lessons: Object.entries(depths).map(([slug, depth]) => ({ slug, depth })) } };
    return new Response(JSON.stringify(body), { status: 200 });
  });
}

const signedIn = () => {
  hint.present = true;
};

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  for (const mock of [push, signIn, answerLearnLessonAction, sendLearnFeedbackAction]) mock.mockClear();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  hint.present = false;
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

async function draw({ lesson = setLesson, group = setGroup, fixes = null as typeof learnFixes | null } = {}) {
  await act(async () => {
    root.render(
      <LessonLive
        lesson={lesson}
        group={group}
        fixes={fixes}
        article={<article data-lesson-article="">{lesson.title}</article>}
        more={<footer data-more="" />}
      />,
    );
  });
}

const $ = (selector: string) => host.querySelector<HTMLElement>(selector);
const main = () => $('[data-answer-main]')!;
const option = (index: number) => $(`[data-option="${index}"] input`)!;
const click = (element: HTMLElement) =>
  act(async () => {
    element.click();
  });
/** A click as a person makes it: the pointer goes down first. */
const tap = (element: HTMLElement) =>
  act(async () => {
    element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    element.click();
  });

describe("a lesson's page in the browser, for a visitor", () => {
  it('asks for nothing, and asks to sign in to save', async () => {
    await draw();
    expect(fetchMock).not.toHaveBeenCalled();
    expect($('[data-visitor-note]')!.textContent).toBe('Sign in with GitHub to save your progress.');
    expect($('[data-depth-squares]')).toBeNull();
  });

  it("keeps a right answer in the browser, and signs in to keep it, through Learn's onboarding back to the lesson", async () => {
    await draw();
    await click(option(0));
    await click(main());
    expect(window.localStorage.getItem(KEPT_ANSWER_KEY)).toBeNull();
    await click(option(1));
    await click(main());
    expect(answerLearnLessonAction).not.toHaveBeenCalled();
    expect(readKeptAnswer()).toEqual({
      slug: setLesson.slug,
      question: setLesson.question.id,
      picked: 1,
      tries: 2,
      language: expect.anything(),
      at: expect.any(Number),
    });
    expect(main().textContent).toBe('Sign in to keep your progress');
    expect($('[data-visitor-line]')).toBeNull();
    await click(main());
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: throughSetup });
  });
});

describe("a lesson's page for a signed-in person, by the Learn sign", () => {
  /** A kept answer for the set's lesson, given `ago` milliseconds before now. */
  const keep = (ago = 60_000, question = setLesson.question.id) =>
    writeKeptAnswer({ slug: setLesson.slug, question, picked: 1, tries: 2, language: null, at: Date.now() - ago });
  const saved = { ok: true, data: { right: true, mine: mineLearned, next: null } };

  it('saves the answer of a person without the sign, shows its depth, and leads them on to keep their progress', async () => {
    signedIn();
    routes(mineNew, setDepths, NO_LESSON_REAL, false);
    answerLearnLessonAction.mockResolvedValue(saved);
    await draw();
    await tap(option(1));
    await click(main());
    expect(answerLearnLessonAction).toHaveBeenCalledOnce();
    expect($('[data-depth-line]')!.textContent).toContain('Learned.');
    expect(main().textContent).toBe('Keep your progress');
    await click(main());
    expect(push).toHaveBeenCalledWith(throughSetup);
    expect(signIn).not.toHaveBeenCalled();
  });

  it("keeps today's buttons when the sign cannot be read, and replays nothing", async () => {
    signedIn();
    keep();
    routes(mineNew, setDepths, NO_LESSON_REAL, null);
    answerLearnLessonAction.mockResolvedValue(saved);
    await draw();
    expect(answerLearnLessonAction).not.toHaveBeenCalled();
    expect(readKeptAnswer()).not.toBeNull();
    await tap(option(1));
    await click(main());
    expect(main().textContent).toBe(`Next: ${setLesson.next!.title}`);
  });

  it('replays a kept answer once, with the sign, while the lesson is unanswered, then removes it', async () => {
    signedIn();
    keep();
    routes(mineNew);
    answerLearnLessonAction.mockResolvedValue(saved);
    await draw();
    expect(answerLearnLessonAction).toHaveBeenCalledOnce();
    expect(answerLearnLessonAction).toHaveBeenCalledWith({
      slug: setLesson.slug,
      question: setLesson.question.id,
      picked: 1,
      tries: 2,
      language: null,
    });
    expect(window.localStorage.getItem(KEPT_ANSWER_KEY)).toBeNull();
    // Back on the lesson, the answer shows as saved.
    expect($('[data-answer-part]')!.getAttribute('data-answer-phase')).toBe('done');
    expect($('[data-lesson-run]')!.textContent).toBe('3 of 9 learned');
    act(() => root.unmount());
    root = createRoot(host);
    await draw();
    expect(answerLearnLessonAction).toHaveBeenCalledOnce();
  });

  it('removes a kept answer unsaved when the lesson is answered, its question changed, or it is an hour old', async () => {
    for (const [mine, ago, question] of [
      [mineLearned, 60_000, setLesson.question.id],
      [mineNew, 60_000, 'another-question'],
      [mineNew, 60 * 60 * 1000, setLesson.question.id],
    ] as const) {
      act(() => root.unmount());
      root = createRoot(host);
      signedIn();
      keep(ago, question);
      routes(mine);
      await draw();
      expect(answerLearnLessonAction).not.toHaveBeenCalled();
      expect(window.localStorage.getItem(KEPT_ANSWER_KEY)).toBeNull();
    }
  });

  it('leaves a kept answer in place for a person without the sign yet, and for another lesson', async () => {
    signedIn();
    keep();
    routes(mineNew, setDepths, NO_LESSON_REAL, false);
    await draw();
    expect(readKeptAnswer()).not.toBeNull();
    act(() => root.unmount());
    root = createRoot(host);
    writeKeptAnswer({ slug: 'another-lesson', question: 'q', picked: 1, tries: 1, language: null, at: Date.now() });
    routes(mineNew);
    await draw();
    expect(readKeptAnswer()!.slug).toBe('another-lesson');
    expect(answerLearnLessonAction).not.toHaveBeenCalled();
  });
});

describe("a lesson's page in the browser, for a person with a session", () => {
  it("reads the person's side of the lesson and of its course, and says nothing to sign in while it waits", async () => {
    signedIn();
    const answers: ((response: Response) => void)[] = [];
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => answers.push(resolve)));
    await draw();
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      `/api/me/learn/lessons/${setLesson.slug}?main=1`,
      `/api/me/learn/courses/${setLesson.course.slug}`,
      `/api/me/learn/lessons/${setLesson.slug}/real-world`,
    ]);
    expect($('[data-visitor-note]')).toBeNull();
    expect($('[data-lesson-run]')!.textContent).toBe('Lesson 3 of 9');
    await act(async () => {
      for (const answer of answers) answer(new Response(JSON.stringify({ mine: mineNew }), { status: 200 }));
    });
    expect($('[data-visitor-note]')).toBeNull();
  });

  it("draws the group's squares once the person's side arrives", async () => {
    signedIn();
    routes(mineNew);
    await draw();
    expect($('[data-lesson-run]')!.textContent).toBe('2 of 9 learned');
    expect($('[data-visitor-note]')).toBeNull();
  });

  it('opens a lesson answered before as answered, with its rating', async () => {
    signedIn();
    routes(mineLearnedRated);
    await draw();
    expect($('[data-answer-part]')!.getAttribute('data-answer-phase')).toBe('done');
    expect($('[data-rate="good"]')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('saves a right answer, and goes on to the next lesson', async () => {
    signedIn();
    routes(mineNew);
    answerLearnLessonAction.mockResolvedValue({ ok: true, data: { right: true, mine: mineLearned, next: null } });
    await draw();
    await click(option(1));
    await click(main());
    expect(answerLearnLessonAction).toHaveBeenCalledWith(
      expect.objectContaining({ slug: setLesson.slug, question: setLesson.question.id, picked: 1, tries: 1 }),
    );
    expect($('[data-lesson-run]')!.textContent).toBe('3 of 9 learned');
    await click(main());
    expect(push).toHaveBeenCalledWith(`/learn/lessons/${setLesson.next!.slug}`);
  });

  it("goes to the course after the group's last lesson", async () => {
    signedIn();
    routes(mineNew, setDepthsLast);
    answerLearnLessonAction.mockResolvedValue({ ok: false, error: 'FAILED' });
    await draw({ lesson: setLessonLast, group: setGroupLast });
    await click(option(1));
    await click(main());
    await click(main());
    expect(push).toHaveBeenCalledWith(`/learn/courses/${setLessonLast.course.slug}`);
  });

  it("leads a project course's lesson to its project's address: the breadcrumb, and after the group's last lesson", async () => {
    signedIn();
    routes(mineNew, setDepthsLast);
    answerLearnLessonAction.mockResolvedValue({ ok: false, error: 'FAILED' });
    const project = { name: 'Django', repo: 'django/django', org: null };
    await draw({ lesson: { ...setLessonLast, course: { ...setLessonLast.course, project } }, group: setGroupLast });
    const crumbs = [...document.querySelectorAll('[data-player-strip] a')].map((a) => a.getAttribute('href'));
    expect(crumbs).toContain('/learn/repos/django/django');
    await click(option(1));
    await click(main());
    await click(main());
    expect(push).toHaveBeenCalledWith('/learn/repos/django/django');
  });

  it('sends a rating, and says whether it was saved', async () => {
    signedIn();
    routes(mineLearned);
    sendLearnFeedbackAction.mockResolvedValue({ ok: true, data: true });
    await draw();
    await click($('[data-rate="good"]')!);
    expect(sendLearnFeedbackAction).toHaveBeenCalledWith({ lesson: setLesson.slug, good: true });
    expect($('[data-rate="good"]')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('never asks a person whose side cannot be read to sign in, and still saves their answer', async () => {
    signedIn();
    fetchMock.mockResolvedValue(new Response('{}', { status: 500 }));
    answerLearnLessonAction.mockResolvedValue({ ok: true, data: { right: true, mine: mineLearned, next: null } });
    await draw();
    expect($('[data-visitor-note]')).toBeNull();
    await tap(option(1));
    await click(main());
    expect(answerLearnLessonAction).toHaveBeenCalledOnce();
    expect(main().textContent).toBe(`Next: ${setLesson.next!.title}`);
    expect($('[data-visitor-line]')).toBeNull();
    expect($('[data-depth-line]')!.textContent).toContain('Learned.');
    await click(main());
    expect(push).toHaveBeenCalledWith(`/learn/lessons/${setLesson.next!.slug}`);
    expect(signIn).not.toHaveBeenCalled();
  });

  it("keeps the answer the API saves nothing of (no profile yet), and leads on through Learn's setup", async () => {
    signedIn();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ mine: null, course: null, learnOnboarded: null })));
    answerLearnLessonAction.mockResolvedValue({ ok: true, data: null });
    await draw();
    await tap(option(1));
    await click(main());
    expect($('[data-answer-note]')!.textContent).toBe(ANSWER_KEPT_NOTE);
    expect(ANSWER_KEPT_NOTE).not.toMatch(/hour|claim|—/i);
    expect(readKeptAnswer()).toEqual({
      slug: setLesson.slug,
      question: setLesson.question.id,
      picked: 1,
      tries: 1,
      language: expect.anything(),
      at: expect.any(Number),
    });
    expect($('[data-visitor-line]')).toBeNull();
    expect(main().textContent).toBe('Keep your progress');
    await click(main());
    expect(push).toHaveBeenCalledWith(throughSetup);
    expect(signIn).not.toHaveBeenCalled();
  });

  it('keeps nothing in the browser when the save fails, and leads on as before', async () => {
    signedIn();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ mine: null, course: null, learnOnboarded: null })));
    answerLearnLessonAction.mockResolvedValue({ ok: false, error: 'FAILED' });
    await draw();
    await tap(option(1));
    await click(main());
    expect(readKeptAnswer()).toBeNull();
    expect($('[data-answer-note]')).toBeNull();
    expect(main().textContent).toBe(`Next: ${setLesson.next!.title}`);
  });

  it('keeps nothing for a member, or a person with the sign, whose save answers nothing: they have a profile', async () => {
    signedIn();
    answerLearnLessonAction.mockResolvedValue({ ok: true, data: null });
    for (const [mine, sign] of [
      [mineNew, true],
      [null, true],
    ] as const) {
      routes(mine, setDepths, NO_LESSON_REAL, sign);
      await draw();
      await tap(option(1));
      await click(main());
      expect(readKeptAnswer()).toBeNull();
      expect($('[data-answer-note]')).toBeNull();
      expect(main().textContent).toBe(`Next: ${setLesson.next!.title}`);
      act(() => root.unmount());
      root = createRoot(host);
    }
  });

  it("saves an answer given while the person's side is read, and does not draw over it when the side arrives", async () => {
    signedIn();
    const answers: ((response: Response) => void)[] = [];
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => answers.push(resolve)));
    answerLearnLessonAction.mockResolvedValue({ ok: true, data: { right: true, mine: mineLearned, next: null } });
    await draw();
    await tap(option(0));
    await click(main());
    await tap(option(1));
    await click(main());
    expect(answerLearnLessonAction).toHaveBeenCalledWith(
      expect.objectContaining({ slug: setLesson.slug, picked: 1, tries: 2 }),
    );
    expect(main().textContent).toBe(`Next: ${setLesson.next!.title}`);
    const answered = $('[data-answer-part]')!;
    answered.querySelector<HTMLElement>('[data-answer-main]')!.focus();
    await act(async () => {
      answers[0](new Response(JSON.stringify({ mine: mineNew })));
      answers[1](
        new Response(
          JSON.stringify({
            course: {
              slug: 'algorithms',
              lessons: Object.entries(setDepths).map(([slug, depth]) => ({ slug, depth })),
            },
          }),
        ),
      );
    });
    // The same answer, in place: not drawn again, the focus where it was, the saved depth over the read.
    expect($('[data-answer-part]')).toBe(answered);
    expect(document.activeElement).toBe(main());
    expect($('[data-option="0"]')!.getAttribute('data-option-mark')).toBe('wrong');
    expect($('[data-lesson-run]')!.textContent).toBe('3 of 9 learned');
    expect(signIn).not.toHaveBeenCalled();
  });

  it("draws the player again when the person's side arrives before they touched it", async () => {
    signedIn();
    const answers: ((response: Response) => void)[] = [];
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => answers.push(resolve)));
    await draw();
    const before = $('[data-answer-part]');
    await act(async () => {
      answers[0](new Response(JSON.stringify({ mine: mineLearnedRated })));
      answers[1](new Response(JSON.stringify({ course: null })));
    });
    expect($('[data-answer-part]')).not.toBe(before);
    expect($('[data-answer-part]')!.getAttribute('data-answer-phase')).toBe('done');
  });
});

describe('"In the real world" under a lesson', () => {
  const section = () => $('[data-lesson-real-world]');
  const fixButton = () => $('[data-fix-real-issue]') as HTMLAnchorElement | null;
  const answerRight = async () => {
    answerLearnLessonAction.mockResolvedValue({ ok: true, data: { right: true, mine: mineLearned, next: null } });
    await tap(option(1));
    await click(main());
  };
  const shiftEnter = () =>
    act(async () => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true }),
      );
    });

  it('is left out for a visitor when the merged fixes cannot be read, reading nothing', async () => {
    await draw();
    expect(section()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a visitor the lesson's merged fixes, each a card that opens its page", async () => {
    await draw({ fixes: learnFixes });
    expect(section()!.textContent).toContain(learnFixes.rows[0].title);
    expect($('[data-real-all-fixes]')!.getAttribute('href')).toBe(
      `/learn/lessons/${setLesson.slug}/real-world?fixed=1`,
    );
    // A visitor has no issues part, so no link to the lesson's open issues either.
    expect($('[data-real-issues-link]')).toBeNull();
    // Each fix opens its own page, "Learn from it".
    expect(section()!.querySelector('a[href="/learn/fixes/harbor-kit/relay/418"]')).not.toBeNull();
  });

  it('is the page as before when the API answers none of it, or fails', async () => {
    signedIn();
    routes(mineNew);
    await draw();
    expect(section()).toBeNull();
    await answerRight();
    expect(fixButton()).toBeNull();
    expect($('[data-depth-line]')!.textContent).not.toContain('Mastered when your fix');

    act(() => root.unmount());
    root = createRoot(host);
    fetchMock.mockImplementation(async (path: string) =>
      path.endsWith('/real-world')
        ? new Response('{}', { status: 500 })
        : new Response(JSON.stringify({ mine: mineNew }), { status: 200 }),
    );
    await draw();
    expect(section()).toBeNull();
  });

  it('shows a person their merged fixes and issues for the lesson, and after a right answer, Fix a real issue', async () => {
    signedIn();
    routes(mineNew, setDepths, lessonRealIssues);
    await draw();
    expect($('[data-real-column="fixes"]')).not.toBeNull();
    expect($('[data-real-column="issues"]')!.querySelectorAll('[data-real-issue]')).toHaveLength(3);
    // Only after a right answer.
    expect(fixButton()).toBeNull();
    await answerRight();
    const href = `/my/issues/${lessonRealIssues.real!.fixAnIssue!.issue.id}?from=learn`;
    expect(fixButton()!.getAttribute('href')).toBe(href);
    expect(fixButton()!.textContent).toContain('Fix a real issue');
  });

  it('opens the issue with Shift + Enter, and leaves Enter to the next lesson', async () => {
    signedIn();
    routes(mineNew, setDepths, lessonRealIssues);
    await draw();
    await answerRight();
    const opened = vi.fn((event: Event) => event.preventDefault());
    fixButton()!.addEventListener('click', opened);
    await shiftEnter();
    expect(opened).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
    // Shift + Enter typed in a field is the field's.
    const field = document.createElement('textarea');
    host.append(field);
    await act(async () => {
      field.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true }),
      );
    });
    expect(opened).toHaveBeenCalledOnce();
    field.remove();
    // Another link with the focus keeps the key; Next, the answer's own button, does not.
    const other = $('[data-real-issues-link]')!;
    await act(async () => {
      other.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true }),
      );
    });
    expect(opened).toHaveBeenCalledOnce();
    await act(async () => {
      main().dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true }),
      );
    });
    expect(opened).toHaveBeenCalledTimes(2);
    expect(push).not.toHaveBeenCalled();
  });

  it("puts the person's own fix under the merged fixes, with its address, and never offers another issue", async () => {
    signedIn();
    routes(mineLearned, setDepths, lessonRealWithFix);
    await draw();
    const mine = $('[data-real-my-fix]')!;
    expect(mine.getAttribute('data-real-my-fix')).toBe('OPEN');
    expect(mine.querySelector('[data-real-my-fix-open]')!.getAttribute('href')).toBe(
      '/my/pull-requests/harbor-kit/relay/431?from=learn',
    );
    const parts = [...section()!.querySelectorAll('[data-real-column]')].map((part) =>
      part.getAttribute('data-real-column'),
    );
    expect(parts).toEqual(['fixes', 'mine']);
    expect(fixButton()).toBeNull();
  });
});

describe('our guess of the setup, from a lesson', () => {
  it('is never started for a visitor', async () => {
    await draw();
    expect(startLearnSetupGuessAction).not.toHaveBeenCalled();
  });

  it('is started once for a person with a session, and the page never waits for it', async () => {
    signedIn();
    routes(mineNew);
    // The start never answers: the person's side is read and the lesson is drawn all the same.
    startLearnSetupGuessAction.mockImplementation(() => new Promise(() => {}));
    await draw();
    await draw();
    expect(startLearnSetupGuessAction).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalled();
    expect(host.textContent).toContain(setLesson.title);
  });
});

const { lessonPartsOf } = await import('./lesson-view');
const { loopGroup, loopLesson, loopQuestionCodes, loopExampleCodes } = await import(
  '@/lib/learn/__fixtures__/lesson-page'
);
const { EXAMPLE_LANGUAGE_KEY } = await import('@/lib/learn/use-example-language');

describe("the language of a lesson's examples", () => {
  /** The person's routes, the lesson's side bringing their setup's main language. */
  function routesWithMain(mainLanguage: string | null) {
    fetchMock.mockImplementation(async (path: string) => {
      const body = path.endsWith('/real-world')
        ? NO_LESSON_REAL
        : path.startsWith('/api/me/learn/lessons/')
          ? { mine: mineNew, mainLanguage }
          : { course: { slug: 'algorithms', lessons: [] } };
      return new Response(JSON.stringify(body), { status: 200 });
    });
  }

  /** The page as the lesson's route draws it: the article drawn the same for everyone, with no main language. */
  async function drawLoop() {
    const parts = lessonPartsOf({
      lesson: loopLesson,
      examples: [{ name: 'main', codes: loopExampleCodes }],
      group: loopGroup,
      links: { markdown: '/learn/lessons/big-o-of-two-loops.md', report: '/report' },
    });
    await act(async () => {
      root.render(
        <LessonLive
          lesson={loopLesson}
          group={loopGroup}
          questionCodes={loopQuestionCodes}
          article={parts.article}
          more={parts.more}
        />,
      );
    });
  }

  const exampleLanguage = () => $('[data-lesson-article] [data-code-language]')?.dataset.codeLanguage;
  /** The question's code, a line to pick: JavaScript's `function`, or Python's `def`. */
  const questionLanguage = () => {
    const text = $('fieldset[aria-label="The code: pick a line"]')?.textContent ?? '';
    return text.includes('function hasDuplicate') ? 'javascript' : text.includes('def ') ? 'python' : null;
  };

  beforeEach(() => window.localStorage.removeItem(EXAMPLE_LANGUAGE_KEY));

  it("switches the article's example and the question's code to the main language once the person's side brings it", async () => {
    signedIn();
    routesWithMain('javascript');
    await drawLoop();
    expect(exampleLanguage()).toBe('javascript');
    expect(questionLanguage()).toBe('javascript');
  });

  it('keeps Python for a visitor, and for a person whose main language the course does not have', async () => {
    await drawLoop();
    expect(exampleLanguage()).toBe('python');
    expect(questionLanguage()).toBe('python');
    act(() => root.unmount());
    root = createRoot(host);
    signedIn();
    routesWithMain('rust');
    await drawLoop();
    expect(exampleLanguage()).toBe('python');
    expect(questionLanguage()).toBe('python');
  });

  it('keeps the code an answer was given in when the side brings the main language after a pick and a check', async () => {
    signedIn();
    // The side is slow: it answers only when the spec lets it.
    const waiting: (() => void)[] = [];
    fetchMock.mockImplementation(
      (path: string) =>
        new Promise<Response>((resolve) => {
          const body = path.endsWith('/real-world')
            ? NO_LESSON_REAL
            : path.startsWith('/api/me/learn/lessons/')
              ? { mine: mineNew, mainLanguage: 'javascript' }
              : { course: { slug: 'algorithms', lessons: [] } };
          waiting.push(() => resolve(new Response(JSON.stringify(body), { status: 200 })));
        }),
    );
    answerLearnLessonAction.mockResolvedValue({ ok: true, data: null });
    await drawLoop();
    expect(questionLanguage()).toBe('python');
    // Python's inner loop is line 3: picked, then checked.
    await tap($('[data-line="3"]')!);
    await tap(main());
    expect($('[data-line="3"]')!.getAttribute('data-line-mark')).toBe('right');
    await act(async () => {
      for (const answer of waiting) answer();
    });
    expect(questionLanguage()).toBe('python');
    expect(exampleLanguage()).toBe('python');
    expect($('[data-line="3"]')!.getAttribute('data-line-mark')).toBe('right');
    expect(host.querySelectorAll('[data-line-mark="right"]')).toHaveLength(1);
  });

  it('lets a tab picked on the page win over the main language', async () => {
    signedIn();
    routesWithMain('javascript');
    await drawLoop();
    await click($('[data-lesson-article] [role="tab"][data-language="python"]')!);
    expect(exampleLanguage()).toBe('python');
    expect(questionLanguage()).toBe('python');
  });
});
