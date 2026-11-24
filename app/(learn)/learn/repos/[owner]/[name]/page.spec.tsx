import { isValidElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadLearnProjectCourse, loadLearnProjectOpenIssues, loadLearnCourses, notFound } = vi.hoisted(() => ({
  loadLearnProjectCourse: vi.fn(),
  loadLearnProjectOpenIssues: vi.fn(),
  loadLearnCourses: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnProjectCourse, loadLearnProjectOpenIssues, loadLearnCourses }));
vi.mock('@/components/learn/course/course-live', () => ({ CourseLive: () => null }));

const { default: RepoCoursePage, generateMetadata, instant } = await import('./page');
const { default: ProjectCourseNotFound } = await import('./not-found');
const OrgPage = await import('../../../orgs/[login]/page');
const { CourseLive } = await import('@/components/learn/course/course-live');
const { courseCards, djangoCourse, kubernetesCourse } = await import('@/lib/learn/__fixtures__/course');

const repoProps = (owner: string, name: string) =>
  ({ params: Promise.resolve({ owner, name }) }) as unknown as PageProps<'/learn/repos/[owner]/[name]'>;
const orgProps = (login: string) =>
  ({ params: Promise.resolve({ login }) }) as unknown as PageProps<'/learn/orgs/[login]'>;
const liveOf = (page: ReactElement) =>
  (page.props as { children: ReactElement[] }).children.find((child) => child.type === CourseLive)!;

/** The route's page is the shared page for its project: drawn here as React would. */
const drawn = async (page: Promise<ReactElement> | ReactElement) => {
  const element = await page;
  return (element.type as (props: unknown) => Promise<ReactElement>)(element.props);
};

beforeEach(() => {
  loadLearnProjectCourse.mockReset();
  loadLearnProjectOpenIssues.mockReset().mockResolvedValue(9);
  loadLearnCourses.mockReset().mockResolvedValue(courseCards);
});

describe("a project course's page", () => {
  it('streams, reading nothing ahead of a request', () => {
    expect(instant).toBe(false);
    expect(OrgPage.instant).toBe(false);
  });

  it('draws the cached course by its project in lower case, with the other courses and its open issues', async () => {
    loadLearnProjectCourse.mockResolvedValue(djangoCourse);
    const page = await drawn(RepoCoursePage(repoProps('Django', 'django')));
    expect(isValidElement(page)).toBe(true);
    expect(liveOf(page).props).toEqual({ course: djangoCourse, others: courseCards, projectIssues: 9 });
    expect(loadLearnProjectCourse).toHaveBeenCalledWith({ repo: 'django/django' });
    expect(loadLearnProjectOpenIssues).toHaveBeenCalledWith({ repo: 'django/django' });

    loadLearnProjectCourse.mockResolvedValue(kubernetesCourse);
    loadLearnProjectOpenIssues.mockResolvedValue(null);
    loadLearnCourses.mockRejectedValue(new Error('down'));
    const org = await drawn(OrgPage.default(orgProps('kubernetes')));
    expect(liveOf(org).props).toEqual({ course: kubernetesCourse, others: [], projectIssues: null });
    expect(loadLearnProjectCourse).toHaveBeenLastCalledWith({ org: 'kubernetes' });
  });

  it('is not there for a project with no course, nor for names GitHub cannot have', async () => {
    loadLearnProjectCourse.mockResolvedValue(null);
    await expect(drawn(RepoCoursePage(repoProps('nobody', 'nothing')))).rejects.toThrow('NEXT_NOT_FOUND');
    loadLearnProjectCourse.mockClear();
    await expect(drawn(OrgPage.default(orgProps('a_b')))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(loadLearnProjectCourse).not.toHaveBeenCalled();
    loadLearnProjectCourse.mockRejectedValueOnce(new Error('down'));
    await expect(drawn(RepoCoursePage(repoProps('django', 'django')))).rejects.toThrow('down');
  });

  it("names the course at its project's address in its metadata, and a missing one as a page not found", async () => {
    loadLearnProjectCourse.mockResolvedValueOnce(djangoCourse);
    expect((await generateMetadata(repoProps('django', 'django'))).alternates?.canonical).toBe(
      '/learn/repos/django/django',
    );
    loadLearnProjectCourse.mockResolvedValueOnce(null);
    expect(await OrgPage.generateMetadata(orgProps('nobody'))).toEqual({
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
