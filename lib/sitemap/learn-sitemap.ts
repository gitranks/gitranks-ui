import type { MetadataRoute } from 'next';

import type { LearnCourseCard, LearnLessonFixesListed, LearnLessonListItem } from '@/lib/learn/course';
import { LEARN_PATH } from '@/lib/learn/learn-path';
import {
  courseHrefOf,
  LEARN_COURSES_PATH,
  learnCourseRealWorldPath,
  learnLessonPath,
  learnLessonRealWorldPath,
} from '@/lib/learn/paths';
import { sitemapEntry } from '@/lib/sitemap/sitemap-url';

/** Learn's courses and their lessons, as the sitemap lists them. */
export type LearnSitemapContent = {
  courses: readonly Pick<LearnCourseCard, 'slug' | 'project'>[];
  lessons: readonly Pick<LearnLessonListItem, 'slug' | 'course' | 'paused' | 'changedAt'>[];
};

/** `lastModified` at the latest of some times, as written; nothing for none. */
function changedAt(times: readonly string[]): { lastModified?: string } {
  const latest = times.reduce<string | undefined>((a, b) => (!a || b > a ? b : a), undefined);
  return latest ? { lastModified: latest } : {};
}

/**
 * The views in real projects search engines keep: a live lesson's when it has a listed merged fix, and a course's
 * (not a project's, whose issues are its project's) when any of its live lessons has one. Only lessons the sitemap
 * lists count. None when it could not be read.
 */
function realProjectsEntriesOf(
  courses: LearnSitemapContent['courses'],
  live: LearnSitemapContent['lessons'],
  listed: readonly LearnLessonFixesListed[] | null,
): MetadataRoute.Sitemap {
  const lessons = new Set(live.map((lesson) => lesson.slug));
  const fixed = (listed ?? []).filter(
    (lesson) => lesson.fixesListed === true && !lesson.paused && lessons.has(lesson.slug),
  );
  const withFix = new Set(fixed.map((lesson) => lesson.course.slug));
  return [
    ...courses
      .filter((course) => !course.project && withFix.has(course.slug))
      .map((course) => sitemapEntry(learnCourseRealWorldPath(course.slug), { priority: 0.5 })),
    ...fixed.map((lesson) => sitemapEntry(learnLessonRealWorldPath(lesson.slug), { priority: 0.5 })),
  ];
}

/**
 * GitRanks Learn's pages for search engines: the landing; and with `content` read, all courses, every course at the
 * last change of its lessons (a project course at its project's address) and every live lesson of a course at its own.
 * A paused lesson is left out, and so is every course the list does not show (a project's removed course among them).
 * With `listed` read, the views in real projects that have a merged fix (`realProjectsEntriesOf`). A fix's pages are in
 * the pull requests' sitemap; the page for maintainers is Contribute's.
 */
export function learnSitemapEntries({
  content = null,
  listed = null,
}: {
  content?: LearnSitemapContent | null;
  listed?: readonly LearnLessonFixesListed[] | null;
} = {}): MetadataRoute.Sitemap {
  const ours = content ?? { courses: [], lessons: [] };
  const live = ours.lessons.filter((lesson) => !lesson.paused);
  return [
    sitemapEntry(LEARN_PATH, { priority: 0.7 }),
    ...(content
      ? [sitemapEntry(LEARN_COURSES_PATH, { ...changedAt(live.map((lesson) => lesson.changedAt)), priority: 0.7 })]
      : []),
    ...ours.courses.map((course) =>
      sitemapEntry(courseHrefOf(course), {
        ...changedAt(live.filter((lesson) => lesson.course.slug === course.slug).map((each) => each.changedAt)),
        priority: 0.7,
      }),
    ),
    ...live.map((lesson) =>
      sitemapEntry(learnLessonPath(lesson.slug), { lastModified: lesson.changedAt, priority: 0.6 }),
    ),
    ...(content ? realProjectsEntriesOf(ours.courses, live, listed) : []),
  ];
}
