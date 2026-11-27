// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hint } = vi.hoisted(() => ({ hint: { present: false } }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { CoursesLive } = await import('./courses-live');
const { resetInterviewsViewer } = await import('@/components/interviews/interviews-viewer');
const { coursesInterviews } = await import('@/components/interviews/learn-gate/__fixtures__/courses');
const { courseCards, lessonList } = await import('@/lib/learn/__fixtures__/course');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
let host: HTMLDivElement;
const fetchMock = vi.fn();
/** The person's routes: their courses (none), whether Interviews is open to them, and the list's part of it. */
const routes = (open: boolean) =>
  fetchMock.mockImplementation(async (path: string) =>
    Response.json(
      path === '/api/me/interviews/open'
        ? { open }
        : path === '/api/me/learn/interviews'
          ? { interviews: coursesInterviews }
          : { mine: [] },
    ),
  );

beforeEach(() => {
  resetInterviewsViewer();
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

const draw = () =>
  act(async () => {
    root.render(<CoursesLive courses={courseCards} lessons={lessonList} query="" />);
  });

describe('all courses in the browser, and Interviews', () => {
  it('is served as today, with nothing of Interviews', () => {
    const served = renderToString(<CoursesLive courses={courseCards} lessons={lessonList} query="" />);
    expect(served).not.toContain('data-courses-companies');
    expect(served).not.toContain('aria-labelledby="interviews"');
  });

  it('a visitor and a person Interviews is not open to keep today’s list', async () => {
    await draw();
    expect(host.querySelector('[data-courses-companies]')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    hint.present = true;
    routes(false);
    await draw();
    expect(host.querySelector('[data-courses-companies]')).toBeNull();
    expect(host.querySelector('section[aria-labelledby="interviews"]')).toBeNull();
  });

  it('a person Interviews is open to gets the row and the section once their browser read them', async () => {
    hint.present = true;
    routes(true);
    await draw();
    expect(host.querySelector('[data-courses-companies]')!.textContent).toContain('Preparing for an interview?');
    expect(
      [...host.querySelectorAll('section[aria-labelledby="interviews"] [data-course-card]')].map((card) =>
        card.getAttribute('data-course-card'),
      ),
    ).toEqual(['interview-skills', 'interviewing-at-northwind']);
  });
});
