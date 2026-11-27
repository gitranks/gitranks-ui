import { isValidElement, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadInterviewsForCourses, loadLearnCourses, loadLearnLessons } = vi.hoisted(() => ({
  loadInterviewsForCourses: vi.fn(),
  loadLearnCourses: vi.fn(),
  loadLearnLessons: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnCourses, loadLearnLessons }));
vi.mock('@/lib/interviews/learn.data', () => ({ loadInterviewsForCourses }));
vi.mock('@/components/learn/courses/courses-live', () => ({ CoursesLive: () => null }));

const { default: CoursesPage, generateMetadata } = await import('./page');
const { CoursesLive } = await import('@/components/learn/courses/courses-live');
const { courseCards, lessonList } = await import('@/lib/learn/__fixtures__/course');

const props = (query: Record<string, string | string[]> = {}) =>
  ({ searchParams: Promise.resolve(query) }) as unknown as PageProps<'/learn/courses'>;
const liveOf = (page: ReactElement) =>
  (page.props as { children: ReactElement[] }).children.find((child) => child.type === CoursesLive)!;

beforeEach(() => {
  loadLearnCourses.mockReset().mockResolvedValue(courseCards);
  loadLearnLessons.mockReset().mockResolvedValue(lessonList);
});

describe('all courses', () => {
  it('draws the cached list and lessons, with the search the address carried', async () => {
    const page = await CoursesPage(props({ q: 'go' }));
    expect(isValidElement(page)).toBe(true);
    expect(liveOf(page).props).toEqual({ courses: courseCards, lessons: lessonList, query: 'go' });
    // Two values are not one search.
    expect(liveOf(await CoursesPage(props({ q: ['go', 'php'] }))).props).toMatchObject({ query: '' });
  });

  it('is the page of today while Interviews is not open to everyone: nothing of it is read or drawn', async () => {
    const page = await CoursesPage(props());
    expect(Object.keys(liveOf(page).props as object)).toEqual(['courses', 'lessons', 'query']);
    expect(loadInterviewsForCourses).not.toHaveBeenCalled();
  });

  it('still draws the list when the lessons cannot be read: the search finds courses only', async () => {
    loadLearnLessons.mockRejectedValue(new Error('down'));
    expect(liveOf(await CoursesPage(props({ q: 'go' }))).props).toEqual({
      courses: courseCards,
      lessons: [],
      query: 'go',
    });
  });

  it('fails with the courses read, for the boundary to catch', async () => {
    loadLearnCourses.mockRejectedValue(new Error('down'));
    await expect(CoursesPage(props())).rejects.toThrow('down');
  });

  it('is indexed with no search, and only followed with one, naming the full list either way', async () => {
    const plain = await generateMetadata(props());
    expect(plain.robots).toBeUndefined();
    expect(plain.alternates?.canonical).toBe('/learn/courses');
    for (const q of ['go', '  sort ']) {
      const searched = await generateMetadata(props({ q }));
      expect(searched.robots, q).toEqual({ index: false, follow: true });
      expect(searched.alternates?.canonical).toBe('/learn/courses');
    }
    expect((await generateMetadata(props({ q: '   ' }))).robots).toBeUndefined();
  });
});
