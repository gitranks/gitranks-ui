import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadLearnCourse, notFound } = vi.hoisted(() => ({
  loadLearnCourse: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnCourse }));
vi.mock('@/components/learn/check/check-live', () => ({ CheckLive: () => null }));

const { default: CheckPage, generateMetadata } = await import('./page');
const { algorithmsCourse } = await import('@/lib/learn/__fixtures__/course');

const props = (course: string, known?: string) =>
  ({
    params: Promise.resolve({ course }),
    searchParams: Promise.resolve(known === undefined ? {} : { known }),
  }) as unknown as PageProps<'/learn/check/[course]'>;
const liveOf = async (course: string, known?: string) =>
  ((await CheckPage(props(course, known))) as ReactElement<{ course: unknown; mode: unknown }>).props;

beforeEach(() => {
  loadLearnCourse.mockReset();
});

describe("a course's check page", () => {
  it('draws the check of the cached course, never indexed', async () => {
    loadLearnCourse.mockResolvedValue(algorithmsCourse);
    expect(await liveOf('algorithms')).toEqual({ course: algorithmsCourse, mode: 'check' });
    expect(await generateMetadata(props('algorithms'))).toEqual({
      title: 'The check of Algorithms and data structures',
      robots: { index: false, follow: false },
    });
  });

  it('draws "What you know" with `?known`, even while the course offers no check', async () => {
    loadLearnCourse.mockResolvedValue({ ...algorithmsCourse, checkOffered: false });
    expect(await liveOf('algorithms', '')).toMatchObject({ mode: 'known' });
    expect((await generateMetadata(props('algorithms', ''))).title).toBe(
      'What you know in Algorithms and data structures',
    );
  });

  it('is not there for a course that is not', async () => {
    loadLearnCourse.mockResolvedValue(null);
    await expect(CheckPage(props('nope'))).rejects.toThrow('NEXT_NOT_FOUND');
    expect((await generateMetadata(props('nope'))).robots).toEqual({ index: false, follow: false });
  });

  it('draws the check of a course that offers none, which says so itself', async () => {
    loadLearnCourse.mockResolvedValue({ ...algorithmsCourse, checkOffered: false });
    expect(await liveOf('algorithms')).toMatchObject({ mode: 'check' });
  });
});
