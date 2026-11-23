// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hint, signIn, sendLearnCourseFeedbackAction } = vi.hoisted(() => ({
  hint: { present: false },
  signIn: vi.fn(async () => undefined),
  sendLearnCourseFeedbackAction: vi.fn(async () => ({ ok: true as const, data: true })),
}));
vi.mock('next-auth/react', () => ({ signIn }));
vi.mock('@/lib/learn/course.actions', () => ({ sendLearnCourseFeedbackAction }));
// The session's hint cookie, as the browser holds it.
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { CourseLive, readCourseSide } = await import('./course-live');
const { algorithmsCourse, doneMine, freshMine, otherCourses, progressMine } = await import(
  '@/lib/learn/__fixtures__/course'
);

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();
const answer = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  signIn.mockClear();
  sendLearnCourseFeedbackAction.mockClear();
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

const draw = () =>
  act(async () => {
    root.render(<CourseLive course={algorithmsCourse} others={otherCourses} />);
  });
const buttonOf = (text: string) =>
  [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.trim() === text);
const lit = () => host.querySelector('[data-course-boxes] [data-lit]')?.textContent ?? '';

describe("a course's page in the browser, for a visitor", () => {
  it('asks for nothing, and signs in back to the course', async () => {
    await draw();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(host.querySelector('[data-square]')).toBeNull();
    await act(async () => buttonOf('Sign in with GitHub')!.click());
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: '/learn/courses/algorithms' });
  });
});

describe("a course's page in the browser, for a person with a session", () => {
  beforeEach(() => {
    hint.present = true;
  });

  it("reads the person's side once, never kept, and fills the page in place", async () => {
    answer({ course: progressMine, checkFirst: false });
    await draw();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/courses/algorithms', { cache: 'no-store' });
    expect(host.querySelectorAll('[data-square]').length).toBeGreaterThan(0);
    expect(buttonOf('Sign in with GitHub')).toBeUndefined();
  });

  it('puts the check first when the route says so', async () => {
    answer({ course: freshMine, checkFirst: true });
    await draw();
    expect(lit()).toContain('Take the 2-minute check');
  });

  it("sends a rating as the person's, for this course", async () => {
    answer({ course: doneMine, checkFirst: false });
    await draw();
    await act(async () => buttonOf('Not good')!.click());
    expect(sendLearnCourseFeedbackAction).toHaveBeenCalledWith({ course: 'algorithms', good: false });
  });

  it('keeps the visitor page when the side cannot be read', async () => {
    answer({}, 503);
    await draw();
    expect(host.querySelector('[data-square]')).toBeNull();
    expect(lit()).toContain('Sign in');
  });
});

describe("reading a course's side", () => {
  beforeEach(() => vi.stubGlobal('fetch', fetchMock));

  it('takes only a whole side of this course', async () => {
    answer({ course: progressMine, checkFirst: true });
    expect(await readCourseSide('algorithms')).toEqual({ mine: progressMine, checkFirst: true });
    // Another course's side.
    answer({ course: progressMine });
    expect(await readCourseSide('go')).toBeNull();
    // A part of a side, or none.
    const { lessons: _lessons, ...noLessons } = progressMine;
    const { check: _check, ...noCheck } = progressMine;
    for (const body of [{ course: noLessons }, { course: noCheck }, { course: null }, {}]) {
      answer(body);
      expect(await readCourseSide('algorithms'), JSON.stringify(Object.keys(body))).toBeNull();
    }
    answer({}, 500);
    expect(await readCourseSide('algorithms')).toBeNull();
    answer({ course: progressMine, checkFirst: 'yes' });
    expect(await readCourseSide('algorithms')).toEqual({ mine: progressMine, checkFirst: false });
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect(await readCourseSide('algorithms')).toBeNull();
  });
});
