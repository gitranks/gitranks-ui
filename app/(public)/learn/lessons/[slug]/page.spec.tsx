import { isValidElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadLearnCourse, loadLearnLessonPage, loadMergedFixes } = vi.hoisted(() => ({
  loadLearnCourse: vi.fn(async (): Promise<unknown> => null),
  loadLearnLessonPage: vi.fn(),
  loadMergedFixes: vi.fn(async (): Promise<unknown> => null),
}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/learn/lesson-page.data', () => ({ loadLearnLessonPage }));
vi.mock('@/lib/learn/real-issues.data', () => ({ loadMergedFixes }));
vi.mock('@/lib/learn/course.data', () => ({ loadLearnCourse }));
vi.mock('@/components/learn/lesson/lesson-screen', () => ({ LessonScreen: () => null }));

const { default: LessonPage, generateMetadata } = await import('./page');
const { LessonScreen } = await import('@/components/learn/lesson/lesson-screen');
const { setGroup, setLesson } = await import('@/lib/learn/__fixtures__/lesson-page');
const { learnFixes } = await import('@/lib/learn/__fixtures__/issues');

const ours = { lesson: setLesson, examples: [], questionCodes: [], group: setGroup };
const props = (slug: string, query: Record<string, string> = {}) =>
  ({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve(query),
  }) as unknown as PageProps<'/learn/lessons/[slug]'>;

beforeEach(() => {
  loadLearnCourse.mockReset().mockResolvedValue(null);
  loadLearnLessonPage.mockReset();
  loadMergedFixes.mockReset().mockResolvedValue(null);
});

describe("a lesson's address", () => {
  it('draws a lesson of ours, opening its fact when the address asks', async () => {
    loadLearnLessonPage.mockResolvedValue(ours);
    const page = await LessonPage(props(setLesson.slug, { fact: '' }));
    expect(isValidElement(page) && page.type).toBe(LessonScreen);
    // The merged fixes are on their way, never awaited before the lesson is drawn: they stream in their own boundary.
    expect((page as { props: object }).props).toEqual({ page: ours, openFact: true, fixes: expect.any(Promise) });
    expect(await (page as { props: { fixes: Promise<unknown> } }).props.fixes).toBeNull();
    const plain = await LessonPage(props(setLesson.slug));
    expect((plain as { props: { openFact: boolean } }).props.openFact).toBe(false);
    loadLearnLessonPage.mockResolvedValueOnce(ours);
    expect((await generateMetadata(props(setLesson.slug))).robots).toBeUndefined();
  });

  it("draws the lesson's merged fixes for everyone, and none when they cannot be read", async () => {
    loadLearnLessonPage.mockResolvedValue(ours);
    loadMergedFixes.mockResolvedValue(learnFixes);
    const fixesOf = async () =>
      ((await LessonPage(props(setLesson.slug))) as { props: { fixes: unknown } }).props.fixes;
    expect(await fixesOf()).toBe(learnFixes);
    expect(loadMergedFixes).toHaveBeenCalledWith({ lesson: setLesson.slug });
    loadMergedFixes.mockResolvedValueOnce(null);
    expect(await fixesOf()).toBeNull();
  });

  it('draws nothing for a slug that is not one of ours: the proxy answered it before the page', async () => {
    loadLearnLessonPage.mockResolvedValue(null);
    await expect(LessonPage(props('route-cache-miss-8f3k'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('names a lesson of ours by its own title and address, and nothing else', async () => {
    loadLearnLessonPage.mockResolvedValueOnce(ours);
    const metadata = await generateMetadata(props(setLesson.slug));
    expect(metadata.title).toBe(setLesson.title);
    expect(metadata.alternates?.canonical).toBe(`/learn/lessons/${setLesson.slug}`);
    expect(metadata.openGraph?.images).toEqual([expect.objectContaining({ alt: setLesson.title })]);

    // A shared fact's link shows the fact's own preview; the page stays the lesson's.
    loadLearnLessonPage.mockResolvedValueOnce(ours);
    const fact = await generateMetadata(props(setLesson.slug, { fact: '' }));
    expect(fact.openGraph?.title).toBe(`${setLesson.fact?.title} · GitRanks Learn`);
    expect(fact.title).toBe(setLesson.title);

    loadLearnLessonPage.mockResolvedValueOnce(null);
    expect(await generateMetadata(props('route-cache-miss-8f3k'))).toEqual({});
  });

  it('is never indexed when its course is of the section Interviews, while Interviews is not open to everyone', async () => {
    loadLearnLessonPage.mockResolvedValue(ours);
    loadLearnCourse.mockResolvedValueOnce({ slug: setLesson.course.slug, kind: 'TOPIC', section: 'INTERVIEWS' });
    const closed = await generateMetadata(props(setLesson.slug));
    expect(closed.robots).toEqual({ index: false, follow: false });
    expect(closed.title).toBe(setLesson.title);
    expect(loadLearnCourse).toHaveBeenCalledWith(setLesson.course.slug);
    // Any other course's lesson, or a course that cannot be read: as today.
    loadLearnCourse.mockResolvedValueOnce({ slug: setLesson.course.slug, kind: 'TOPIC', section: null });
    expect((await generateMetadata(props(setLesson.slug))).robots).toBeUndefined();
    loadLearnCourse.mockRejectedValueOnce(new Error('down'));
    expect((await generateMetadata(props(setLesson.slug))).robots).toBeUndefined();
  });
});
