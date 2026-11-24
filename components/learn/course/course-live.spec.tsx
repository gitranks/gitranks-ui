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
const REAL_WORLD = '/api/me/learn/courses/algorithms/real-world';
/** The person's side answers `body`; the course's open issues answer `real` (an API without them: nothing). */
const answer = (body: unknown, status = 200, real: { body: unknown; status?: number } = { body: {} }) =>
  fetchMock.mockImplementation(async (url: string) =>
    url.endsWith('/real-world')
      ? new Response(JSON.stringify(real.body), { status: real.status ?? 200 })
      : new Response(JSON.stringify(body), { status }),
  );
const sideCalls = () => fetchMock.mock.calls.filter(([url]) => !String(url).endsWith('/real-world'));

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

  it('names the merged fixes (from five) as a link while Learn is open to everyone, and not at all while it is closed', async () => {
    const numbers = (issuesFixed: number | null) => ({ ...algorithmsCourse.numbers, issuesFixed });
    const drawWith = async (issuesFixed: number | null, everyone: boolean) => {
      await act(async () =>
        root.render(
          <CourseLive
            course={{ ...algorithmsCourse, numbers: numbers(issuesFixed) }}
            others={otherCourses}
            everyone={everyone}
          />,
        ),
      );
      return host.querySelector<HTMLAnchorElement>('[data-course-fixed]');
    };
    expect((await drawWith(212, true))?.getAttribute('href')).toBe('/learn/courses/algorithms/real-world?fixed=1');
    expect(await drawWith(212, false)).toBeNull();
    expect(await drawWith(4, true)).toBeNull();
    expect(await drawWith(null, true)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
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

  it("reads the person's side once, never kept, asking whether the check leads, and fills the page in place", async () => {
    answer({ course: progressMine, checkFirst: false });
    await draw();
    expect(sideCalls()).toEqual([['/api/me/learn/courses/algorithms?check=1', { cache: 'no-store' }]]);
    expect(fetchMock).toHaveBeenCalledWith(REAL_WORLD, { cache: 'no-store' });
    expect(host.querySelectorAll('[data-square]').length).toBeGreaterThan(0);
    expect(signInButton()).toBeUndefined();
  });

  it('puts the check first when the side says so', async () => {
    answer({ course: freshMine, checkFirst: true });
    await draw();
    expect(lit()).toContain('Take the 2-minute check');
  });

  it("makes the last box the course's open issues when their list has some, linking to the course's view", async () => {
    answer({ course: progressMine, checkFirst: false }, 200, { body: { openIssues: 2 } });
    await draw();
    const box = host.querySelector('[data-course-boxes]')!;
    expect(box.textContent).toContain('2 open issues for this course');
    expect(box.querySelector('a[href="/learn/courses/algorithms/real-world"]')).not.toBeNull();
  });

  it("draws the person's boxes once, after the open issues are read too, never changing them after", async () => {
    let answerIssues!: (response: Response) => void;
    fetchMock.mockImplementation((url: string) =>
      url.endsWith('/real-world')
        ? new Promise<Response>((resolve) => {
            answerIssues = resolve;
          })
        : Promise.resolve(new Response(JSON.stringify({ course: progressMine, checkFirst: false }))),
    );
    await draw();
    // The side came; the open issues did not yet: nothing of the person's is drawn.
    expect(host.querySelectorAll('ol [data-square]').length).toBe(0);
    await act(async () => answerIssues(new Response(JSON.stringify({ openIssues: 2 }))));
    expect(host.querySelectorAll('[data-square]').length).toBeGreaterThan(0);
    expect(host.querySelector('[data-course-boxes]')!.textContent).toContain('2 open issues for this course');
  });

  it('keeps where to go next on a finished course, naming the open issues there', async () => {
    answer({ course: doneMine, checkFirst: false }, 200, { body: { openIssues: 3 } });
    await draw();
    const boxes = host.querySelector('[data-course-boxes]')!;
    expect(boxes.textContent).toContain('Go further');
    const issues = boxes.querySelector('[data-further-issues]')!;
    expect(issues.textContent).toContain('Fix a real issue');
    expect(issues.textContent).toContain('3 open issues for this course.');
    expect(issues.querySelector('a')!.getAttribute('href')).toBe('/learn/courses/algorithms/real-world');
  });

  it('keeps the boxes as they were when the open issues are none, fail, or are not known to the API', async () => {
    const boxesWith = async (real: { body: unknown; status?: number }) => {
      answer({ course: progressMine, checkFirst: false }, 200, real);
      await draw();
      const text = host.querySelector('[data-course-boxes]')!.textContent;
      act(() => root.unmount());
      root = createRoot(host);
      return text;
    };
    const plain = await boxesWith({ body: {} });
    expect(plain).not.toContain('open issues');
    for (const real of [{ body: { openIssues: 0 } }, { body: { openIssues: null } }, { body: {}, status: 500 }]) {
      expect(await boxesWith(real), JSON.stringify(real)).toBe(plain);
    }
  });

  it("links the merged fixes' count for a learner, and for a visitor only while Learn is open to everyone", async () => {
    const course = { ...algorithmsCourse, numbers: { ...algorithmsCourse.numbers, issuesFixed: 212 } };
    answer({ course: progressMine, checkFirst: false });
    await act(async () => root.render(<CourseLive course={course} others={otherCourses} />));
    const link = host.querySelector<HTMLAnchorElement>('[data-course-fixed]');
    expect(link?.textContent).toContain('real issues fixed');
    expect(link?.getAttribute('href')).toBe('/learn/courses/algorithms/real-world?fixed=1');
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

  it('asks whether the check leads unless told not to', async () => {
    answer({ course: progressMine, checkFirst: true });
    await readCourseSide('algorithms');
    expect(fetchMock).toHaveBeenLastCalledWith('/api/me/learn/courses/algorithms?check=1', { cache: 'no-store' });
    await readCourseSide('algorithms', false);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/me/learn/courses/algorithms', { cache: 'no-store' });
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
