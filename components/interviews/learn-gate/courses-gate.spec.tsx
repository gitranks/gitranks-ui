// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hint } = vi.hoisted(() => ({ hint: { present: false } }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { useCoursesInterviews } = await import('./courses-gate');
const { courseCardOf, coursesInterviewsFrom, coursesInterviewsOf, COURSES_INTERVIEWS_MINE_PATH } = await import(
  './courses-interviews'
);
const { coursesInterviews, interviewSkillsCard, northwindCourseCard, sectionCards } = await import(
  './__fixtures__/courses'
);
const { forCourses } = await import('@/lib/interviews/__fixtures__/learn');
const { resetInterviewsViewer } = await import('@/components/interviews/interviews-viewer');
const { algorithmsCourse } = await import('@/lib/learn/__fixtures__/course');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("Interviews' answer for Learn's list of all courses", () => {
  it('keeps the top five, the companies that use a course, and the cards of the section in its order', () => {
    expect(coursesInterviews.top.map((company) => company.slug)).toEqual(['northwind', 'tallgrass']);
    expect(coursesInterviews.companies.map(({ company }) => company.slug)).toEqual(['northwind', 'tallgrass']);
    expect(coursesInterviews.section).toEqual([
      { course: interviewSkillsCard, company: null },
      { course: northwindCourseCard, company: forCourses.top[0] },
    ]);
  });

  it('leaves out a course of the section it holds no card of', () => {
    expect(coursesInterviewsOf(forCourses, [northwindCourseCard])?.section.map(({ course }) => course.slug)).toEqual([
      'interviewing-at-northwind',
    ]);
  });

  it('is nothing with no company and no course of the section: the list is then today', () => {
    expect(coursesInterviewsOf({ top: [], companies: [], section: [] }, sectionCards)).toBeNull();
    expect(
      coursesInterviewsOf({ top: [], companies: [{ ...forCourses.companies[0], courses: [] }], section: [] }, []),
    ).toBeNull();
  });

  it('turns a whole course into its card, and keeps an answer only of the right shape', () => {
    const card = courseCardOf(algorithmsCourse);
    expect(Object.keys(card).sort()).toEqual(
      ['covers', 'kind', 'languages', 'lessons', 'name', 'numbers', 'project', 'section', 'slug'].sort(),
    );
    expect(card.section).toBeNull();
    expect(coursesInterviewsFrom(coursesInterviews)).toBe(coursesInterviews);
    for (const wrong of [null, undefined, 'x', { top: [] }, { top: [], companies: [], section: null }]) {
      expect(coursesInterviewsFrom(wrong)).toBeNull();
    }
  });
});

describe('what the list of all courses shows of Interviews, as this browser knows it', () => {
  let host: HTMLDivElement;
  let root: Root;
  let seen: unknown[];
  const fetchMock = vi.fn();

  function Probe({ served }: { served: typeof coursesInterviews | null }) {
    seen.push(useCoursesInterviews(served));
    return null;
  }
  const draw = (served: typeof coursesInterviews | null = null) =>
    act(async () => {
      root.render(<Probe served={served} />);
    });
  const routes = (open: boolean, interviews: unknown = coursesInterviews) =>
    fetchMock.mockImplementation(async (path: string) =>
      Response.json(path === COURSES_INTERVIEWS_MINE_PATH ? { interviews } : { open }),
    );

  beforeEach(() => {
    resetInterviewsViewer();
    seen = [];
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

  it('asks nothing for a visitor', async () => {
    await draw();
    expect(seen.at(-1)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('asks nothing more for a person Interviews is not open to, past whether it is', async () => {
    hint.present = true;
    routes(false);
    await draw();
    expect(seen.at(-1)).toBeNull();
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual(['/api/me/interviews/open']);
  });

  it('reads it for a person Interviews is open to, never kept', async () => {
    hint.present = true;
    routes(true);
    await draw();
    expect(seen.at(-1)).toEqual(coursesInterviews);
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual(['/api/me/interviews/open', '/api/me/learn/interviews']);
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ cache: 'no-store' });
  });

  it('keeps the list as it is when the read fails or answers nothing', async () => {
    hint.present = true;
    routes(true, null);
    await draw();
    expect(seen.at(-1)).toBeNull();
  });

  it('takes what the server drew once Interviews is open to everyone, asking nothing', async () => {
    hint.present = true;
    await draw(coursesInterviews);
    expect(seen.every((value) => value === coursesInterviews)).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
