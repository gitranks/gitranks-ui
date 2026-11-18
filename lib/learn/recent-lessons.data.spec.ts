import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PublicLesson } from './learn.types';

vi.mock('server-only', () => ({}));
const { cacheLife, readPublicLessons } = vi.hoisted(() => ({
  cacheLife: vi.fn(),
  readPublicLessons: vi.fn(async (): Promise<PublicLesson[] | null> => null),
}));
vi.mock('next/cache', () => ({ cacheLife }));
vi.mock('./public-lessons.data', () => ({ readPublicLessons }));

const { LEARN_RECENT_LESSONS, readRecentLessons } = await import('./recent-lessons.data');

const lesson = (index: number): PublicLesson => ({
  slug: `lesson-${index}-abcdef`,
  title: `Lesson ${index}`,
  language: null,
  repo: null,
  publishedAt: '2026-11-14T08:00:00.000Z',
  modifiedAt: '2026-11-14T08:00:00.000Z',
});

describe("the front door's recent lessons", () => {
  beforeEach(() => cacheLife.mockReset());

  it('keeps the newest few, in the order the API gives them, for hours', async () => {
    readPublicLessons.mockResolvedValueOnce(Array.from({ length: 10 }, (_, index) => lesson(index)));
    const lessons = await readRecentLessons();
    expect(lessons.map(({ slug }) => slug)).toEqual(
      Array.from({ length: LEARN_RECENT_LESSONS }, (_, index) => `lesson-${index}-abcdef`),
    );
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('hours');
  });

  it('answers none, for minutes only, when the API did not answer', async () => {
    readPublicLessons.mockResolvedValueOnce(null);
    expect(await readRecentLessons()).toEqual([]);
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith('minutes');
  });
});
