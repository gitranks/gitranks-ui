import type { MetadataRoute } from 'next';

import type { LearnCourseCard, LearnLessonListItem } from '@/lib/learn/course';
import type { PublicLesson } from '@/lib/learn/learn.types';
import { LEARN_MAINTAINERS_PATH, LEARN_PATH, lessonPath } from '@/lib/learn/learn-path';
import { coursePath, LEARN_COURSES_PATH, learnLessonPath } from '@/lib/learn/paths';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';

/** Learn's courses and their lessons, as the sitemap lists them once Learn is open to everyone. */
export type LearnSitemapContent = {
  courses: readonly Pick<LearnCourseCard, 'slug'>[];
  lessons: readonly Pick<LearnLessonListItem, 'slug' | 'course' | 'paused' | 'changedAt'>[];
};

/** `lastModified` at the latest of some times, as written; nothing for none. */
function changedAt(times: readonly string[]): { lastModified?: string } {
  const latest = times.reduce<string | undefined>((a, b) => (!a || b > a ? b : a), undefined);
  return latest ? { lastModified: latest } : {};
}

/**
 * GitRanks Learn's pages for search engines: the page for maintainers and every public lesson of a fix at its last
 * change, as before; and only while the switch that opens Learn to everyone is open (`frontDoorOpen`), the landing,
 * all courses, every course at the last change of its lessons and every live lesson of a course at its own. A paused
 * lesson is left out, and so is a lesson's result page: it names a person and repeats the lesson.
 */
export function learnSitemapEntries(
  lessons: readonly PublicLesson[],
  { frontDoorOpen, content = null }: { frontDoorOpen: boolean; content?: LearnSitemapContent | null },
): MetadataRoute.Sitemap {
  const ours = frontDoorOpen && content ? content : { courses: [], lessons: [] };
  const live = ours.lessons.filter((lesson) => !lesson.paused);
  const listed = new Set(live.map((lesson) => lesson.slug));
  return [
    ...(frontDoorOpen ? [sitemapEntry(LEARN_PATH, { priority: 0.7 })] : []),
    ...(frontDoorOpen && content
      ? [sitemapEntry(LEARN_COURSES_PATH, { ...changedAt(live.map((lesson) => lesson.changedAt)), priority: 0.7 })]
      : []),
    ...ours.courses.map((course) =>
      sitemapEntry(coursePath(course.slug), {
        ...changedAt(live.filter((lesson) => lesson.course.slug === course.slug).map((each) => each.changedAt)),
        priority: 0.7,
      }),
    ),
    ...live.map((lesson) =>
      sitemapEntry(learnLessonPath(lesson.slug), { lastModified: lesson.changedAt, priority: 0.6 }),
    ),
    sitemapEntry(LEARN_MAINTAINERS_PATH, { priority: 0.4 }),
    ...lessons
      .filter((lesson) => !listed.has(lesson.slug))
      .map((lesson) =>
        sitemapEntry(lessonPath(lesson.slug), {
          lastModified: lesson.modifiedAt,
          changeFrequency: 'yearly',
          priority: 0.6,
        }),
      ),
  ];
}
