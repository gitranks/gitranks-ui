import { isValidElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadLearnCourse, loadLearnCourses, notFound } = vi.hoisted(() => ({
  loadLearnCourse: vi.fn(),
  loadLearnCourses: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
const everyone = vi.hoisted(() => vi.fn(async () => true));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/learn/learn-everyone-cached', () => ({ learnOpenToEveryoneCached: everyone }));
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnCourse, loadLearnCourses }));
vi.mock('@/components/learn/course/course-live', () => ({ CourseLive: () => null }));

const { default: CoursePage, generateMetadata } = await import('./page');
const { default: CourseNotFound } = await import('./not-found');
const { CourseLive } = await import('@/components/learn/course/course-live');
const { algorithmsCourse, courseCards } = await import('@/lib/learn/__fixtures__/course');

const props = (slug: string) =>
  ({ params: Promise.resolve({ slug }) }) as unknown as PageProps<'/learn/courses/[slug]'>;
const liveOf = (page: ReactElement) =>
  (page.props as { children: ReactElement[] }).children.find((child) => child.type === CourseLive)!;

beforeEach(() => {
  loadLearnCourse.mockReset();
  loadLearnCourses.mockReset().mockResolvedValue(courseCards);
});

describe("a course's page", () => {
  it('draws the cached course, with all courses for its foot', async () => {
    loadLearnCourse.mockResolvedValue(algorithmsCourse);
    const page = await CoursePage(props('algorithms'));
    expect(isValidElement(page)).toBe(true);
    expect(liveOf(page).props).toEqual({ course: algorithmsCourse, others: courseCards });
    expect(loadLearnCourse).toHaveBeenCalledWith('algorithms');
  });

  it('still draws the course when the other courses cannot be read, naming none', async () => {
    loadLearnCourse.mockResolvedValue(algorithmsCourse);
    loadLearnCourses.mockRejectedValue(new Error('down'));
    expect(liveOf(await CoursePage(props('algorithms'))).props).toEqual({ course: algorithmsCourse, others: [] });
  });

  it('is not there for a course that is not, and fails with the course read', async () => {
    loadLearnCourse.mockResolvedValueOnce(null);
    await expect(CoursePage(props('nope'))).rejects.toThrow('NEXT_NOT_FOUND');
    loadLearnCourse.mockRejectedValueOnce(new Error('down'));
    await expect(CoursePage(props('algorithms'))).rejects.toThrow('down');
  });

  it('names the course in its metadata, and a missing one as a page not found, never indexed', async () => {
    loadLearnCourse.mockResolvedValueOnce(algorithmsCourse);
    const open = await generateMetadata(props('algorithms'));
    expect(open.alternates?.canonical).toBe('/learn/courses/algorithms');
    expect(open.robots).toBeUndefined();
    // Not indexed while the switch that opens Learn to everyone is closed.
    everyone.mockResolvedValueOnce(false);
    loadLearnCourse.mockResolvedValueOnce(algorithmsCourse);
    expect((await generateMetadata(props('algorithms'))).robots).toEqual({ index: false, follow: false });
    loadLearnCourse.mockResolvedValueOnce(null);
    expect(await generateMetadata(props('nope'))).toEqual({
      title: 'Page not found',
      robots: { index: false, follow: false },
    });
  });

  it("says a missing course's page does not exist, naming nothing, with the way to all courses", () => {
    const html = renderToStaticMarkup(<CourseNotFound />);
    expect(html).toContain('data-course-gone="missing"');
    expect(html).toContain('This page does not exist');
    expect(html).toContain('href="/learn/courses"');
  });
});
