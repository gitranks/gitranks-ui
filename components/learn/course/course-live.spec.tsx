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

const signInButton = () => buttonOf('Sign in with GitHub') ?? buttonOf('Sign in to take the check');

describe("a course's page in the browser, for a visitor", () => {
  it('asks for nothing, and signs in back to the course, lit', async () => {
    await draw();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(host.querySelector('[data-square]')).toBeNull();
    expect(lit()).toContain('Sign in with GitHub');
    await act(async () => buttonOf('Sign in with GitHub')!.click());
    expect(signIn).toHaveBeenCalledWith('github-basic', { redirectTo: '/learn/courses/algorithms' });
  });
});

describe("a course's page in the browser, for a person with a session", () => {
  beforeEach(() => {
    hint.present = true;
  });

  it('lights nothing and never asks to sign in while their side is on its way', async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    await draw();
    expect(signInButton()).toBeUndefined();
    expect(host.querySelector('[data-course-boxes] [data-lit]')).toBeNull();
  });

  it("reads the person's side once, never kept, without the check's question, and fills the page in place", async () => {
    answer({ course: progressMine, checkFirst: false });
    await draw();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // The check's page ships later: until then the page never asks whether the check leads.
    expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/courses/algorithms', { cache: 'no-store' });
    expect(host.querySelectorAll('[data-square]').length).toBeGreaterThan(0);
    expect(signInButton()).toBeUndefined();
  });

  it('puts the check first when the side says so', async () => {
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

  it('never sends them to sign in again when no side comes, or its read fails: the first lesson takes Enter', async () => {
    for (const fail of [() => answer({ course: null, checkFirst: false }), () => answer({}, 503)]) {
      fail();
      await draw();
      expect(signInButton()).toBeUndefined();
      expect(host.querySelector('ol [data-square]')).toBeNull();
      expect(lit()).toContain('Start here');
      act(() => root.unmount());
      root = createRoot(host);
    }
    fetchMock.mockRejectedValue(new Error('offline'));
    await draw();
    expect(signInButton()).toBeUndefined();
  });
});

describe("reading a course's side", () => {
  beforeEach(() => vi.stubGlobal('fetch', fetchMock));

  it('asks whether the check leads only when told to', async () => {
    answer({ course: progressMine, checkFirst: true });
    await readCourseSide('algorithms', true);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/me/learn/courses/algorithms?check=1', { cache: 'no-store' });
  });

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
