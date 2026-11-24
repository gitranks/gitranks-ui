import 'server-only';

import { CourseShareCard, LearnShareCard } from './course-cards';
import { LESSON_CARD_HEADERS } from './lesson-card-response';
import type { LearnCourse, LearnCourseCard } from '@/lib/learn/course';
import { type CourseShareState, courseNotServedResponse, courseUnavailableResponse } from '@/lib/learn/course-share';
import { courseCardVersionOf, coursesCardFiguresOf, coursesCardVersionOf } from '@/lib/learn/course-share-card';
import { courseCardHrefOf, LEARN_COURSES_CARD_PATH, learnCourseCardPath } from '@/lib/learn/paths';
import { drawSocialCard } from '@/lib/social-card/social-card';

/** A course's picture drawn as a PNG. */
export const drawCourseCard = (course: LearnCourse) => drawSocialCard(<CourseShareCard course={course} />);

/** The picture of all courses drawn as a PNG. */
export const drawCoursesCard = (courses: readonly LearnCourseCard[]) =>
  drawSocialCard(<LearnShareCard figures={coursesCardFiguresOf(courses)} />);

/** A picture under exactly `?v=<version>`, else a 308 to its current address, so no query makes it draw again. */
async function versionedCard(
  path: string,
  version: string,
  search: string,
  draw: () => Promise<Uint8Array<ArrayBuffer>>,
): Promise<Response> {
  if (search !== `?v=${version}`) {
    return new Response(null, {
      status: 308,
      headers: { Location: `${path}?v=${version}`, 'Cache-Control': 'private, no-store' },
    });
  }
  try {
    return new Response(await draw(), { headers: LESSON_CARD_HEADERS });
  } catch (error) {
    console.error('Error drawing a course card:', error);
    return courseUnavailableResponse();
  }
}

/**
 * A course's picture, by the course's state (`course-share.ts`), kept as a lesson's picture is. It is drawn at the
 * address its course's links lead to: a project course's picture asked under its slug goes to its project's address.
 */
export async function courseCardResponse(
  _slug: string,
  search: string,
  state: () => Promise<CourseShareState>,
  draw: (course: LearnCourse) => Promise<Uint8Array<ArrayBuffer>> = drawCourseCard,
): Promise<Response> {
  let found: CourseShareState;
  try {
    found = await state();
  } catch {
    return courseUnavailableResponse();
  }
  if (found.kind !== 'live') return courseNotServedResponse(found, learnCourseCardPath);
  const { course } = found;
  return versionedCard(courseCardHrefOf(course), courseCardVersionOf(course), search, () => draw(course));
}

/** The picture of all courses, drawn from the list as everyone reads it. */
export async function coursesCardResponse(
  search: string,
  courses: () => Promise<LearnCourseCard[]>,
  draw: (courses: readonly LearnCourseCard[]) => Promise<Uint8Array<ArrayBuffer>> = drawCoursesCard,
): Promise<Response> {
  let read: LearnCourseCard[];
  try {
    read = await courses();
  } catch {
    return courseUnavailableResponse();
  }
  return versionedCard(LEARN_COURSES_CARD_PATH, coursesCardVersionOf(read), search, () => draw(read));
}
