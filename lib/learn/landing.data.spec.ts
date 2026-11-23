import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadLearnCourse, loadLearnLessonPage } = vi.hoisted(() => ({
  loadLearnCourse: vi.fn(),
  loadLearnLessonPage: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('./course.data', () => ({ loadLearnCourse }));
vi.mock('./lesson-page.data', () => ({ loadLearnLessonPage }));

const { loadTryLessons } = await import('./landing.data');
const { tryLessonOf } = await import('./landing');
const { algorithmsCourse, algorithmsCoursePaused, courseCards } = await import('./__fixtures__/course');
const { setGroup, setLesson } = await import('./__fixtures__/lesson-page');

const page = { lesson: setLesson, examples: [], questionCodes: [], group: setGroup };
const topics = courseCards.filter((course) => course.kind === 'TOPIC');
const firstSlugOf = (course: typeof algorithmsCourse) =>
  course.groups.flatMap((group) => group.lessons).find((lesson) => !lesson.paused)?.slug;

beforeEach(() => {
  loadLearnCourse.mockReset();
  loadLearnLessonPage.mockReset();
});

describe('the lessons offered at the top of the landing', () => {
  it("reads the first lesson of each topic course, never a language course's", async () => {
    loadLearnCourse.mockResolvedValue(algorithmsCourse);
    loadLearnLessonPage.mockResolvedValue(page);
    const lessons = await loadTryLessons(courseCards);
    expect(loadLearnCourse.mock.calls.map(([slug]) => slug)).toEqual(topics.slice(0, 5).map((course) => course.slug));
    expect(loadLearnLessonPage).toHaveBeenCalledWith(firstSlugOf(algorithmsCourse));
    expect(lessons[0]).toEqual(tryLessonOf(page));
  });

  it('skips a paused first lesson for the next live one', async () => {
    loadLearnCourse.mockResolvedValue(algorithmsCoursePaused);
    loadLearnLessonPage.mockResolvedValue(page);
    await loadTryLessons(topics.slice(0, 1));
    expect(loadLearnLessonPage).toHaveBeenCalledWith(firstSlugOf(algorithmsCoursePaused));
  });

  it('leaves out a lesson that cannot be read, and offers none when no lesson can be', async () => {
    loadLearnCourse.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('down'));
    loadLearnCourse.mockResolvedValue(algorithmsCourse);
    loadLearnLessonPage.mockResolvedValueOnce(null).mockResolvedValue(page);
    const two = [topics[0], { ...topics[0], slug: 'b' }, { ...topics[0], slug: 'c' }, { ...topics[0], slug: 'd' }];
    expect(await loadTryLessons(two)).toHaveLength(1);
    loadLearnCourse.mockReset().mockRejectedValue(new Error('down'));
    expect(await loadTryLessons(topics)).toEqual([]);
    expect(await loadTryLessons([])).toEqual([]);
  });
});
