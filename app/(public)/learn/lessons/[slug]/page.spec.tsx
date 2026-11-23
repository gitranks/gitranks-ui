import { isValidElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadLearnLessonPage, loadLessonPage, learnOpenToEveryone } = vi.hoisted(() => ({
  loadLearnLessonPage: vi.fn(),
  loadLessonPage: vi.fn(),
  learnOpenToEveryone: vi.fn(async () => true),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/learn/lesson-page.data', () => ({ loadLearnLessonPage }));
vi.mock('@/lib/learn/lesson-public.data', () => ({ loadLessonPage }));
vi.mock('@/lib/learn/learn-everyone', () => ({ learnOpenToEveryone }));
vi.mock('@/app/learn/components/lesson-page', () => ({ LessonPageView: () => null }));
vi.mock('@/components/learn/lesson/lesson-screen', () => ({ LessonScreen: () => null }));

const { default: LessonPage, generateMetadata } = await import('./page');
const { LessonPageView } = await import('@/app/learn/components/lesson-page');
const { LessonScreen } = await import('@/components/learn/lesson/lesson-screen');
const { setGroup, setLesson } = await import('@/lib/learn/__fixtures__/lesson-page');

const ours = { lesson: setLesson, examples: [], questionCodes: [], group: setGroup };
const props = (slug: string, query: Record<string, string> = {}) =>
  ({
    params: Promise.resolve({ slug }),
    searchParams: Promise.resolve(query),
  }) as unknown as PageProps<'/learn/lessons/[slug]'>;

beforeEach(() => {
  loadLearnLessonPage.mockReset();
  loadLessonPage.mockReset();
});

describe("a lesson's address", () => {
  it('draws a lesson of ours, opening its fact when the address asks', async () => {
    loadLearnLessonPage.mockResolvedValue(ours);
    const page = await LessonPage(props(setLesson.slug, { fact: '' }));
    expect(isValidElement(page) && page.type).toBe(LessonScreen);
    expect((page as { props: object }).props).toEqual({ page: ours, openFact: true });
    const plain = await LessonPage(props(setLesson.slug));
    expect((plain as { props: { openFact: boolean } }).props.openFact).toBe(false);
    expect(loadLessonPage).not.toHaveBeenCalled();
  });

  it("draws a fix's lesson as before when the slug is not one of ours", async () => {
    loadLearnLessonPage.mockResolvedValue(null);
    const page = await LessonPage(props('route-cache-miss-8f3k'));
    expect(isValidElement(page) && page.type).toBe(LessonPageView);
    expect((page as { props: object }).props).toEqual({ slug: 'route-cache-miss-8f3k' });
  });

  it("names a lesson of ours by its own title and address, and a fix's lesson as before", async () => {
    loadLearnLessonPage.mockResolvedValueOnce(ours);
    const metadata = await generateMetadata(props(setLesson.slug));
    expect(metadata.title).toBe(setLesson.title);
    expect(metadata.alternates?.canonical).toBe(`/learn/lessons/${setLesson.slug}`);
    expect(loadLessonPage).not.toHaveBeenCalled();

    loadLearnLessonPage.mockResolvedValueOnce(null);
    loadLessonPage.mockResolvedValueOnce(null);
    expect((await generateMetadata(props('route-cache-miss-8f3k'))).robots).toEqual({
      index: false,
      follow: false,
    });
  });
});
