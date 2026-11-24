import { isValidElement, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadLearnAddress, notFound } = vi.hoisted(() => ({
  loadLearnAddress: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/learn/lesson-page.data', () => ({ loadLearnAddress }));

const { default: OrgCourseGonePage, generateMetadata, instant } = await import('./page');
const { CourseGoneView } = await import('@/components/learn/course/course-gone');

const paused = { state: 'PAUSED', movedTo: null, title: 'Kubernetes, from the inside', course: null, project: true };
const removed = { ...paused, state: 'REMOVED' };
const props = (login: string) =>
  ({ params: Promise.resolve({ login }) }) as unknown as PageProps<'/learn/orgs/_gone/[login]'>;

/** The route's page is the shared page for its project: drawn here as React would. */
const drawn = async (page: Promise<ReactElement> | ReactElement) => {
  const element = await page;
  return (element.type as (props: unknown) => Promise<ReactElement>)(element.props);
};

beforeEach(() => loadLearnAddress.mockReset());

describe("a paused or removed organisation's course page", () => {
  it('streams, reading nothing ahead of a request', () => {
    expect(instant).toBe(false);
  });

  it("draws the state its organisation's address answers, naming the course", async () => {
    for (const [address, state] of [
      [paused, 'paused'],
      [removed, 'removed'],
    ] as const) {
      loadLearnAddress.mockResolvedValueOnce(address);
      const page = await drawn(OrgCourseGonePage(props('Kubernetes')));
      expect(isValidElement(page) && page.type).toBe(CourseGoneView);
      const { text, state: shown } = (page as { props: { text: { lead: string }; state: string } }).props;
      expect(shown).toBe(state);
      expect(text.lead).toContain('“Kubernetes, from the inside”');
    }
    expect(loadLearnAddress).toHaveBeenCalledWith('org', 'kubernetes');
  });

  it('is not there for a course that is neither, nor for a login GitHub cannot have', async () => {
    for (const address of [null, { ...paused, state: 'MOVED' }]) {
      loadLearnAddress.mockResolvedValueOnce(address);
      await expect(drawn(OrgCourseGonePage(props('kubernetes')))).rejects.toThrow('NEXT_NOT_FOUND');
    }
    loadLearnAddress.mockClear();
    await expect(drawn(OrgCourseGonePage(props('_gone')))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(loadLearnAddress).not.toHaveBeenCalled();
  });

  it('keeps search engines away, under the state as the title', async () => {
    loadLearnAddress.mockResolvedValueOnce(paused);
    expect(await generateMetadata(props('kubernetes'))).toEqual({
      title: 'This course is paused',
      robots: { index: false, follow: false },
    });
  });
});
