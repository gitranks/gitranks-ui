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
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('next-auth/react', () => ({ signIn }));
vi.mock('@/lib/learn/lesson-page.actions', () => ({ answerLearnLessonAction, sendLearnFeedbackAction }));
// The session's hint cookie, as the browser holds it.
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { LessonLive } = await import('./lesson-live');
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

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();

/** What the person's two routes answer: their side of the lesson, and each lesson's depth in the course. */
function routes(mine: unknown, depths: Record<string, string> = setDepths) {
  fetchMock.mockImplementation(async (path: string) => {
    const body = path.startsWith('/api/me/learn/lessons/')
      ? { mine }
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
  vi.unstubAllGlobals();
});

async function draw({ lesson = setLesson, group = setGroup } = {}) {
  await act(async () => {
    root.render(
      <LessonLive
        lesson={lesson}
        group={group}
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

describe("a lesson's page in the browser, for a visitor", () => {
  it('asks for nothing, and asks to sign in to save', async () => {
    await draw();
    expect(fetchMock).not.toHaveBeenCalled();
    expect($('[data-visitor-note]')!.textContent).toBe('Sign in with GitHub to save your progress.');
    expect($('[data-depth-squares]')).toBeNull();
  });

  it('saves nothing for a right answer, and signs in back to the lesson', async () => {
    await draw();
    await click(option(1));
    await click(main());
    expect(answerLearnLessonAction).not.toHaveBeenCalled();
    await click(main());
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: `/learn/lessons/${setLesson.slug}` });
  });
});

describe("a lesson's page in the browser, for a person with a session", () => {
  it("reads the person's side of the lesson and of its course, and says nothing to sign in while it waits", async () => {
    signedIn();
    const answers: ((response: Response) => void)[] = [];
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => answers.push(resolve)));
    await draw();
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      `/api/me/learn/lessons/${setLesson.slug}`,
      `/api/me/learn/courses/${setLesson.course.slug}`,
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

  it('sends a rating, and says whether it was saved', async () => {
    signedIn();
    routes(mineLearned);
    sendLearnFeedbackAction.mockResolvedValue({ ok: true, data: true });
    await draw();
    await click($('[data-rate="good"]')!);
    expect(sendLearnFeedbackAction).toHaveBeenCalledWith({ lesson: setLesson.slug, good: true });
    expect($('[data-rate="good"]')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('treats a person whose side cannot be read as a visitor', async () => {
    signedIn();
    fetchMock.mockResolvedValue(new Response('{}', { status: 500 }));
    await draw();
    expect($('[data-visitor-note]')!.textContent).toBe('Sign in with GitHub to save your progress.');
  });
});
