import { beforeEach, describe, expect, it, vi } from 'vitest';

const { hasMergedFixOf, issuesNamesOf, loadLearnCourse, loadLearnLessonPage } = vi.hoisted(() => ({
  hasMergedFixOf: vi.fn(async (): Promise<boolean | null> => true),
  issuesNamesOf: vi.fn(async () => ({ course: 'Interview skills', lesson: 'Think aloud' })),
  loadLearnCourse: vi.fn(async (): Promise<unknown> => null),
  loadLearnLessonPage: vi.fn(async (): Promise<unknown> => null),
}));
vi.mock('@/components/learn/issues/issues-page', () => ({ IssuesPage: () => null, issuesNamesOf }));
vi.mock('@/lib/learn/issues.data', () => ({ hasMergedFixOf }));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnCourse }));
vi.mock('@/lib/learn/lesson-page.data', () => ({ loadLearnLessonPage }));

const course = await import('./page');
const lesson = await import('../../../lessons/[slug]/real-world/page');

/*
 * A course or a lesson in real projects, of the section Interviews: not indexed while Interviews is closed, even with a
 * merged fix, and not when its course cannot be read. Any other course's page is as today.
 */

const NOT_INDEXED = { index: false, follow: false };
const props = (slug: string) => ({ params: Promise.resolve({ slug }), searchParams: Promise.resolve({}) });
const SECTION = { slug: 'interview-skills', kind: 'TOPIC', section: 'INTERVIEWS' };
const OTHER = { slug: 'algorithms', kind: 'TOPIC', section: null };

beforeEach(() => {
  hasMergedFixOf.mockReset().mockResolvedValue(true);
  loadLearnCourse.mockReset().mockResolvedValue(null);
  loadLearnLessonPage.mockReset().mockResolvedValue({ lesson: { course: { slug: SECTION.slug } } });
});

describe('a course in real projects', () => {
  it('of the section: not indexed while closed, even with a merged fix', async () => {
    loadLearnCourse.mockResolvedValueOnce(SECTION);
    expect((await course.generateMetadata(props(SECTION.slug) as never)).robots).toEqual(NOT_INDEXED);
    expect(loadLearnCourse).toHaveBeenCalledWith(SECTION.slug);
  });

  it('any other course: as today; a course not read: not indexed while closed', async () => {
    loadLearnCourse.mockResolvedValueOnce(OTHER);
    expect((await course.generateMetadata(props(OTHER.slug) as never)).robots).toBeUndefined();
    loadLearnCourse.mockRejectedValueOnce(new Error('down'));
    expect((await course.generateMetadata(props(OTHER.slug) as never)).robots).toEqual(NOT_INDEXED);
  });
});

describe('a lesson in real projects', () => {
  it("of a course of the section: not indexed while closed, by its course's read", async () => {
    loadLearnCourse.mockResolvedValueOnce(SECTION);
    expect((await lesson.generateMetadata(props('think-aloud') as never)).robots).toEqual(NOT_INDEXED);
    expect(loadLearnLessonPage).toHaveBeenCalledWith('think-aloud');
    expect(loadLearnCourse).toHaveBeenCalledWith(SECTION.slug);
  });

  it('of any other course: as today; its lesson or course not read: not indexed while closed', async () => {
    loadLearnCourse.mockResolvedValueOnce(OTHER);
    expect((await lesson.generateMetadata(props('big-o') as never)).robots).toBeUndefined();
    loadLearnLessonPage.mockRejectedValueOnce(new Error('down'));
    expect((await lesson.generateMetadata(props('big-o') as never)).robots).toEqual(NOT_INDEXED);
    loadLearnCourse.mockRejectedValueOnce(new Error('down'));
    expect((await lesson.generateMetadata(props('big-o') as never)).robots).toEqual(NOT_INDEXED);
  });
});
