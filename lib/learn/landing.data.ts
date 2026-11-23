import 'server-only';

import type { LearnCourseCard } from './course';
import { loadLearnCourse } from './course.data';
import { type TryLesson, tryCoursesOf, tryLessonOf } from './landing';
import { loadLearnLessonPage } from './lesson-page.data';

/** A course's first lesson that is not paused; null when it has none or cannot be read. */
async function firstLessonOf(slug: string): Promise<TryLesson | null> {
  try {
    const course = await loadLearnCourse(slug);
    const first = course?.groups.flatMap((group) => group.lessons).find((lesson) => !lesson.paused);
    const page = first ? await loadLearnLessonPage(first.slug) : null;
    return page ? tryLessonOf(page) : null;
  } catch {
    return null;
  }
}

/**
 * The lessons the landing offers at the top: the first lesson of each topic course, from the cached courses and
 * lessons. One that cannot be read is left out; none leaves the card out.
 */
export async function loadTryLessons(courses: readonly LearnCourseCard[]): Promise<TryLesson[]> {
  const lessons = await Promise.all(tryCoursesOf(courses).map((course) => firstLessonOf(course.slug)));
  return lessons.filter((lesson): lesson is TryLesson => lesson !== null);
}
