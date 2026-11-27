import { isValidElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadLearnCourse, loadLearnCourses, notFound, permanentRedirect } = vi.hoisted(() => ({
  loadLearnCourse: vi.fn(),
  loadLearnCourses: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  permanentRedirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ notFound, permanentRedirect }));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnCourse, loadLearnCourses }));
vi.mock('@/components/learn/course/course-live', () => ({ CourseLive: () => null }));

const { default: CoursePage, generateMetadata } = await import('./page');
const { default: CourseNotFound } = await import('./not-found');
const { CourseLive } = await import('@/components/learn/course/course-live');
const { algorithmsCourse, courseCards, djangoCourse } = await import('@/lib/learn/__fixtures__/course');

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
    expect(liveOf(await CoursePage(props('algorithms'))).props).toEqual({
      course: algorithmsCourse,
      others: [],
    });
  });

  it("sends a project course to its project's address", async () => {
    loadLearnCourse.mockResolvedValue(djangoCourse);
    await expect(CoursePage(props('django'))).rejects.toThrow('NEXT_REDIRECT /learn/repos/django/django');
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
    loadLearnCourse.mockResolvedValueOnce(null);
    expect(await generateMetadata(props('nope'))).toEqual({
      title: 'Page not found',
      robots: { index: false, follow: false },
    });
  });

  it('is never indexed for a course of the section Interviews while Interviews is not open to everyone', async () => {
    for (const course of [
      { ...algorithmsCourse, slug: 'interview-skills', section: 'INTERVIEWS' as const },
      {
        ...algorithmsCourse,
        slug: 'interviewing-at-northwind',
        kind: 'COMPANY' as const,
        section: 'INTERVIEWS' as const,
      },
    ]) {
      loadLearnCourse.mockResolvedValueOnce(course);
      const metadata = await generateMetadata(props(course.slug));
      expect(metadata.robots, course.slug).toEqual({ index: false, follow: false });
      expect(metadata.title).toBe(course.name);
    }
  });

  it("says a missing course's page does not exist, naming nothing, with the way to all courses", () => {
    const html = renderToStaticMarkup(<CourseNotFound />);
    expect(html).toContain('data-course-gone="missing"');
    expect(html).toContain('This page does not exist');
    expect(html).toContain('href="/learn/courses"');
  });
});
