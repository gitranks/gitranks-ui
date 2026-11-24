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

const { default: RepoCourseGonePage, generateMetadata, instant } = await import('./page');
const { CourseGoneView } = await import('@/components/learn/course/course-gone');

const paused = { state: 'PAUSED', movedTo: null, title: 'Django, from the inside', course: null, project: true };
const removed = { ...paused, state: 'REMOVED' };
const props = (owner: string, name: string) =>
  ({ params: Promise.resolve({ owner, name }) }) as unknown as PageProps<'/learn/repos/_gone/[owner]/[name]'>;

/** The route's page is the shared page for its project: drawn here as React would. */
const drawn = async (page: Promise<ReactElement> | ReactElement) => {
  const element = await page;
  return (element.type as (props: unknown) => Promise<ReactElement>)(element.props);
};

beforeEach(() => loadLearnAddress.mockReset());

describe("a paused or removed repository's course page", () => {
  it('streams, reading nothing ahead of a request', () => {
    expect(instant).toBe(false);
  });

  it("draws the state its repository's address answers, naming the course", async () => {
    for (const [address, state] of [
      [removed, 'removed'],
      [paused, 'paused'],
    ] as const) {
      loadLearnAddress.mockResolvedValueOnce(address);
      const page = await drawn(RepoCourseGonePage(props('Django', 'Django')));
      expect(isValidElement(page) && page.type).toBe(CourseGoneView);
      const { text, state: shown } = (page as { props: { text: { lead: string }; state: string } }).props;
      expect(shown).toBe(state);
      expect(text.lead).toContain('“Django, from the inside”');
    }
    expect(loadLearnAddress).toHaveBeenCalledWith('repository', 'django/django');
  });

  it('is not there for a course that is neither, nor for names GitHub cannot have', async () => {
    for (const address of [null, { ...paused, state: 'LIVE' }]) {
      loadLearnAddress.mockResolvedValueOnce(address);
      await expect(drawn(RepoCourseGonePage(props('django', 'django')))).rejects.toThrow('NEXT_NOT_FOUND');
    }
    loadLearnAddress.mockClear();
    await expect(drawn(RepoCourseGonePage(props('_gone', 'x')))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(loadLearnAddress).not.toHaveBeenCalled();
  });

  it('keeps search engines away, even when the address cannot be read', async () => {
    loadLearnAddress.mockRejectedValueOnce(new Error('down'));
    expect((await generateMetadata(props('django', 'django'))).robots).toEqual({ index: false, follow: false });
  });
});
