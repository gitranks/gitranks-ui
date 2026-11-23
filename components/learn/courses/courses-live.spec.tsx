// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hint } = vi.hoisted(() => ({ hint: { present: false } }));
// The session's hint cookie, as the browser holds it.
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { CoursesLive, readCoursesSide } = await import('./courses-live');
const { courseCards, coursesMine, lessonDepths, lessonList } = await import('@/lib/learn/__fixtures__/course');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();
const answer = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  window.history.replaceState(null, '', '/learn/courses');
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
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

const draw = (query = '') =>
  act(async () => {
    root.render(<CoursesLive courses={courseCards} lessons={lessonList} query={query} />);
  });
const found = () => host.querySelector('section[aria-labelledby="found-lessons"]')!;

describe('all courses in the browser', () => {
  it('asks for nothing for a visitor, and shows no squares in a search', async () => {
    await draw('go');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(found().querySelector('[data-square], [data-square-slot]')).toBeNull();
  });

  it("reads a person's side once, never kept, and fills each card and each found lesson's square", async () => {
    hint.present = true;
    answer({ mine: { courses: coursesMine, depths: lessonDepths } });
    await draw('go');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/courses', { cache: 'no-store' });
    expect(found().querySelectorAll('[data-square="learned"]')).toHaveLength(1);
  });

  it('keeps the squares in their slots when the depths could not be read', async () => {
    hint.present = true;
    answer({ mine: { courses: coursesMine, depths: null } });
    await draw('go');
    expect(found().querySelectorAll('[data-square-slot]')).toHaveLength(5);
    expect(found().querySelector('[data-square]')).toBeNull();
  });

  it('keeps the visitor page when the side cannot be read', async () => {
    hint.present = true;
    answer({}, 503);
    await draw('go');
    expect(found().querySelector('[data-square], [data-square-slot]')).toBeNull();
  });
});

describe("reading the person's side of all courses", () => {
  it('takes a list of courses, and the depths only when they are there', async () => {
    answer({ mine: { courses: coursesMine, depths: lessonDepths } });
    expect(await readCoursesSide()).toEqual({ courses: coursesMine, depths: lessonDepths });
    answer({ mine: { courses: coursesMine, depths: 'all' } });
    expect(await readCoursesSide()).toEqual({ courses: coursesMine, depths: null });
    for (const body of [{ mine: null }, { mine: { courses: null } }, {}]) {
      answer(body);
      expect(await readCoursesSide(), JSON.stringify(body)).toBeNull();
    }
    answer({}, 500);
    expect(await readCoursesSide()).toBeNull();
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect(await readCoursesSide()).toBeNull();
  });
});
