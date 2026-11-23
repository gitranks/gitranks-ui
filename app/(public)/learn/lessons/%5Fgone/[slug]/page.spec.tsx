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

const { default: LessonGonePage, generateMetadata } = await import('./page');
const { LessonGoneView } = await import('@/components/learn/lesson/lesson-gone');
const { pausedAddress, removedAddress } = await import('@/lib/learn/__fixtures__/lesson-gone');

const props = (slug: string) =>
  ({ params: Promise.resolve({ slug }) }) as unknown as PageProps<'/learn/lessons/_gone/[slug]'>;

beforeEach(() => loadLearnAddress.mockReset());

describe("a paused or removed lesson's page", () => {
  it('draws the state the address answers, with its course', async () => {
    for (const address of [pausedAddress, removedAddress]) {
      loadLearnAddress.mockResolvedValueOnce(address);
      const page = await LessonGonePage(props('sets'));
      expect(isValidElement(page) && page.type).toBe(LessonGoneView);
      expect((page as { props: { state: string; course: unknown } }).props).toMatchObject({
        state: address.state,
        course: address.course,
      });
    }
    expect(loadLearnAddress).toHaveBeenCalledWith('lesson', 'sets');
  });

  it('is not there for a lesson that is neither paused nor removed', async () => {
    for (const address of [null, { ...pausedAddress, state: 'LIVE' }, { ...pausedAddress, state: 'MOVED' }]) {
      loadLearnAddress.mockResolvedValueOnce(address);
      await expect(LessonGonePage(props('sets'))).rejects.toThrow('NEXT_NOT_FOUND');
    }
  });

  it('keeps search engines away, under the state as the title, even when the address cannot be read', async () => {
    loadLearnAddress.mockResolvedValueOnce(pausedAddress);
    expect(await generateMetadata(props('sets'))).toEqual({
      title: 'This lesson is paused',
      robots: { index: false, follow: false },
    });
    loadLearnAddress.mockRejectedValueOnce(new Error('down'));
    expect((await generateMetadata(props('sets'))).robots).toEqual({ index: false, follow: false });
  });
});
