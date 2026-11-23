import { isValidElement } from 'react';
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

const { default: CourseGonePage, generateMetadata } = await import('./page');
const { CourseGoneView } = await import('@/components/learn/course/course-gone');

const paused = { state: 'PAUSED', movedTo: null, title: 'Algorithms and data structures', course: null };
const removed = { ...paused, state: 'REMOVED' };
const props = (slug: string) =>
  ({ params: Promise.resolve({ slug }) }) as unknown as PageProps<'/learn/courses/_gone/[slug]'>;

beforeEach(() => loadLearnAddress.mockReset());

describe("a paused or removed course's page", () => {
  it('draws the state the address answers, naming the course', async () => {
    for (const [address, state] of [
      [paused, 'paused'],
      [removed, 'removed'],
    ] as const) {
      loadLearnAddress.mockResolvedValueOnce(address);
      const page = await CourseGonePage(props('algorithms'));
      expect(isValidElement(page) && page.type).toBe(CourseGoneView);
      const { text, state: drawn } = (page as { props: { text: { lead: string }; state: string } }).props;
      expect(drawn).toBe(state);
      expect(text.lead).toContain('“Algorithms and data structures”');
    }
    expect(loadLearnAddress).toHaveBeenCalledWith('course', 'algorithms');
  });

  it('is not there for a course that is neither paused nor removed', async () => {
    for (const address of [null, { ...paused, state: 'LIVE' }, { ...paused, state: 'MOVED' }]) {
      loadLearnAddress.mockResolvedValueOnce(address);
      await expect(CourseGonePage(props('algorithms'))).rejects.toThrow('NEXT_NOT_FOUND');
    }
  });

  it('keeps search engines away, under the state as the title, even when the address cannot be read', async () => {
    loadLearnAddress.mockResolvedValueOnce(paused);
    expect(await generateMetadata(props('algorithms'))).toEqual({
      title: 'This course is paused',
      robots: { index: false, follow: false },
    });
    loadLearnAddress.mockRejectedValueOnce(new Error('down'));
    expect((await generateMetadata(props('algorithms'))).robots).toEqual({ index: false, follow: false });
  });
});
