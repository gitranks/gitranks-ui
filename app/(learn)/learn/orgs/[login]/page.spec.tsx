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

const { default: OrgCoursePage, generateMetadata, instant } = await import('./page');
const { default: ProjectCourseNotFound } = await import('./not-found');
const { CourseLive } = await import('@/components/learn/course/course-live');
const { kubernetesCourse } = await import('@/lib/learn/__fixtures__/course');

const props = (login: string) =>
  ({ params: Promise.resolve({ login }) }) as unknown as PageProps<'/learn/orgs/[login]'>;
const liveOf = (page: ReactElement) =>
  (page.props as { children: ReactElement[] }).children.find((child) => child.type === CourseLive);

/** The route's page is the shared page for its project: drawn here as React would. */
const drawn = async (page: Promise<ReactElement> | ReactElement) => {
  const element = await page;
  return (element.type as (props: unknown) => Promise<ReactElement>)(element.props);
};

beforeEach(() => {
  loadLearnProjectCourse.mockReset();
  loadLearnProjectOpenIssues.mockReset().mockResolvedValue(null);
});

describe("an organisation's course page", () => {
  it('streams, reading nothing ahead of a request', () => {
    expect(instant).toBe(false);
  });

  it('draws the cached course by its login in lower case, with no count when there is none', async () => {
    loadLearnProjectCourse.mockResolvedValue(kubernetesCourse);
    const page = await drawn(OrgCoursePage(props('Kubernetes')));
    expect(isValidElement(page)).toBe(true);
    expect(liveOf(page)?.props).toEqual({ course: kubernetesCourse, others: [], projectIssues: null });
    expect(loadLearnProjectCourse).toHaveBeenCalledWith({ org: 'kubernetes' });
    expect(loadLearnProjectOpenIssues).toHaveBeenCalledWith({ org: 'kubernetes' });
  });

  it('is not there for an organisation with no course, nor for a login GitHub cannot have', async () => {
    loadLearnProjectCourse.mockResolvedValue(null);
    await expect(drawn(OrgCoursePage(props('nobody')))).rejects.toThrow('NEXT_NOT_FOUND');
    loadLearnProjectCourse.mockClear();
    await expect(drawn(OrgCoursePage(props('a_b')))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(loadLearnProjectCourse).not.toHaveBeenCalled();
  });

  it("names the course at its organisation's address in its metadata, and a missing one as a page not found", async () => {
    loadLearnProjectCourse.mockResolvedValueOnce(kubernetesCourse);
    expect((await generateMetadata(props('kubernetes'))).alternates?.canonical).toBe('/learn/orgs/kubernetes');
    loadLearnProjectCourse.mockResolvedValueOnce(null);
    expect(await generateMetadata(props('nobody'))).toEqual({
      title: 'Page not found',
      robots: { index: false, follow: false },
    });
  });

  it("says a missing project course's page does not exist", () => {
    expect(renderToStaticMarkup(<ProjectCourseNotFound />)).toContain('data-course-gone="missing"');
  });
});
