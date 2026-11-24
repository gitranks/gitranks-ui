import type { MetadataRoute } from 'next';

import type { LearnCourseCard, LearnLessonListItem } from '@/lib/learn/course';
import { LEARN_PATH } from '@/lib/learn/learn-path';
import { coursePath, LEARN_COURSES_PATH, learnLessonPath } from '@/lib/learn/paths';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';

/** Learn's courses and their lessons, as the sitemap lists them. */
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
 * GitRanks Learn's pages for search engines: the landing; and with `content` read, all courses, every course at the
 * last change of its lessons and every live lesson of a course at its own. A paused lesson is left out. A fix's pages
 * are in the pull requests' sitemap; the page for maintainers is Contribute's.
 */
export function learnSitemapEntries({
  content = null,
}: {
  content?: LearnSitemapContent | null;
} = {}): MetadataRoute.Sitemap {
  const ours = content ?? { courses: [], lessons: [] };
  const live = ours.lessons.filter((lesson) => !lesson.paused);
  return [
    sitemapEntry(LEARN_PATH, { priority: 0.7 }),
    ...(content
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
  ];
}
