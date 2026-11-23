// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hint } = vi.hoisted(() => ({ hint: { present: false } }));
// The session's hint cookie, as the browser holds it.
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { CoursesLive, readCourseDepths, readCoursesSide } = await import('./courses-live');
const { courseCards, coursesMine, lessonDepths, lessonList } = await import('@/lib/learn/__fixtures__/course');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();
const answer = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }));
/** The two answers of the person's route: their courses, and the depths when asked. */
function routes(depths: unknown, depthsStatus = 200) {
  fetchMock.mockImplementation(async (path: string) =>
    path.includes('?depths=')
      ? new Response(JSON.stringify({ depths }), { status: depthsStatus })
      : new Response(JSON.stringify({ mine: coursesMine }), { status: 200 }),
  );
}
const type = (text: string) =>
  act(async () => {
    const input = host.querySelector('input')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

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

  it("reads a person's courses in one read, never kept, and no depths with no search", async () => {
    hint.present = true;
    routes(lessonDepths);
    await draw();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/me/learn/courses', { cache: 'no-store' });
    // A search that finds no lesson of a course they started asks for nothing more.
    await type('php');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reads the depths once a search shows a lesson of a course they started, and only once', async () => {
    hint.present = true;
    routes(lessonDepths);
    await draw('go');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith('/api/me/learn/courses?depths=algorithms,go', { cache: 'no-store' });
    expect(found().querySelectorAll('[data-square="learned"]')).toHaveLength(1);
    await type('sort');
    await type('go');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the squares in their slots when the depths could not be read', async () => {
    hint.present = true;
    routes(null, 503);
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
  it('takes a list of courses, or none', async () => {
    answer({ mine: coursesMine });
    expect(await readCoursesSide()).toEqual(coursesMine);
    for (const body of [{ mine: null }, { mine: { courses: coursesMine } }, {}]) {
      answer(body);
      expect(await readCoursesSide(), JSON.stringify(body)).toBeNull();
    }
    answer({}, 500);
    expect(await readCoursesSide()).toBeNull();
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect(await readCoursesSide()).toBeNull();
  });

  it('takes the depths only when they are a map', async () => {
    answer({ depths: lessonDepths });
    expect(await readCourseDepths(['algorithms'])).toEqual(lessonDepths);
    for (const body of [{ depths: null }, { depths: 'all' }, { depths: [] }, {}]) {
      answer(body);
      expect(await readCourseDepths(['algorithms']), JSON.stringify(body)).toBeNull();
    }
  });
});
