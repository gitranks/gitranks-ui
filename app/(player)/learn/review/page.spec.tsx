import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadLearnCourse } = vi.hoisted(() => ({ loadLearnCourse: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnCourse }));
vi.mock('@/components/learn/review/review-live', () => ({ ReviewLive: () => null }));

const { default: ReviewPage, metadata } = await import('./page');
const { algorithmsCourse } = await import('@/lib/learn/__fixtures__/course');

const props = (course?: string | string[]) =>
  ({ searchParams: Promise.resolve(course === undefined ? {} : { course }) }) as unknown as PageProps<'/learn/review'>;
const courseOf = async (course?: string | string[]) =>
  ((await ReviewPage(props(course))) as ReactElement<{ course: unknown }>).props.course;

beforeEach(() => {
  loadLearnCourse.mockReset();
});

describe('the review’s page', () => {
  it('is the person’s own: never indexed', () => {
    expect(metadata).toEqual({ title: 'Your review', robots: { index: false, follow: false } });
  });

  it('is every course without `?course=`, and reads nothing', async () => {
    expect(await courseOf()).toBeNull();
    expect(loadLearnCourse).not.toHaveBeenCalled();
  });

  it('names the course `?course=` scopes it to, from the cached course', async () => {
    loadLearnCourse.mockResolvedValue(algorithmsCourse);
    expect(await courseOf('algorithms')).toEqual({ slug: algorithmsCourse.slug, title: algorithmsCourse.name });
    expect(loadLearnCourse).toHaveBeenCalledWith('algorithms');
  });

  it('is every course for a course that is not, one of another shape, or one that cannot be read', async () => {
    loadLearnCourse.mockResolvedValueOnce(null);
    expect(await courseOf('nope')).toBeNull();
    expect(await courseOf('../x')).toBeNull();
    expect(await courseOf(['a', 'b'])).toBeNull();
    loadLearnCourse.mockRejectedValueOnce(new Error('down'));
    expect(await courseOf('algorithms')).toBeNull();
    expect(loadLearnCourse).toHaveBeenCalledTimes(2);
  });
});
