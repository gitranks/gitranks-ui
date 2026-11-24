import { isValidElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadLearnProjectCourse, loadLearnProjectOpenIssues, notFound } = vi.hoisted(() => ({
  loadLearnProjectCourse: vi.fn(),
  loadLearnProjectOpenIssues: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnProjectCourse, loadLearnProjectOpenIssues }));
vi.mock('@/components/learn/course/course-live', () => ({ CourseLive: () => null }));

const { default: RepoCoursePage, generateMetadata, instant } = await import('./page');
const { default: ProjectCourseNotFound } = await import('./not-found');
const { CourseLive } = await import('@/components/learn/course/course-live');
const { djangoCourse } = await import('@/lib/learn/__fixtures__/course');

const props = (owner: string, name: string) =>
  ({ params: Promise.resolve({ owner, name }) }) as unknown as PageProps<'/learn/repos/[owner]/[name]'>;
const liveOf = (page: ReactElement) =>
  (page.props as { children: ReactElement[] }).children.find((child) => child.type === CourseLive);

/** The route's page is the shared page for its project: drawn here as React would. */
const drawn = async (page: Promise<ReactElement> | ReactElement) => {
  const element = await page;
  return (element.type as (props: unknown) => Promise<ReactElement>)(element.props);
};

beforeEach(() => {
  loadLearnProjectCourse.mockReset();
  loadLearnProjectOpenIssues.mockReset().mockResolvedValue(9);
});

describe("a repository's course page", () => {
  it('streams, reading nothing ahead of a request', () => {
    expect(instant).toBe(false);
  });

  it('draws the cached course by its repository in lower case, with its open issues and no other course', async () => {
    loadLearnProjectCourse.mockResolvedValue(djangoCourse);
    const page = await drawn(RepoCoursePage(props('Django', 'django')));
    expect(isValidElement(page)).toBe(true);
    expect(liveOf(page)?.props).toEqual({ course: djangoCourse, others: [], projectIssues: 9 });
    expect(loadLearnProjectCourse).toHaveBeenCalledWith({ repo: 'django/django' });
    expect(loadLearnProjectOpenIssues).toHaveBeenCalledWith({ repo: 'django/django' });
  });

  it('is not there for a repository with no course, nor for names GitHub cannot have; fails with the read', async () => {
    loadLearnProjectCourse.mockResolvedValue(null);
    await expect(drawn(RepoCoursePage(props('nobody', 'nothing')))).rejects.toThrow('NEXT_NOT_FOUND');
    loadLearnProjectCourse.mockClear();
    await expect(drawn(RepoCoursePage(props('-x', 'y')))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(loadLearnProjectCourse).not.toHaveBeenCalled();
    loadLearnProjectCourse.mockRejectedValueOnce(new Error('down'));
    await expect(drawn(RepoCoursePage(props('django', 'django')))).rejects.toThrow('down');
  });

  it("names the course at its repository's address in its metadata, and a missing one as a page not found", async () => {
    loadLearnProjectCourse.mockResolvedValueOnce(djangoCourse);
    expect((await generateMetadata(props('django', 'django'))).alternates?.canonical).toBe(
      '/learn/repos/django/django',
    );
    loadLearnProjectCourse.mockResolvedValueOnce(null);
    expect(await generateMetadata(props('nobody', 'nothing'))).toEqual({
      title: 'Page not found',
      robots: { index: false, follow: false },
    });
  });

  it("says a missing project course's page does not exist, naming nothing, with the way to all courses", () => {
    const html = renderToStaticMarkup(<ProjectCourseNotFound />);
    expect(html).toContain('data-course-gone="missing"');
    expect(html).toContain('href="/learn/courses"');
  });
});
