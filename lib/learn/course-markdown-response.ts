import type { LearnCourseCard } from './course';
import { learnCourseMarkdownOf, learnCoursesMarkdownOf } from './course-markdown';
import { type CourseShareState, courseNotServedResponse, courseUnavailableResponse } from './course-share';
import { learnLandingMarkdownOf } from './landing';
import { LESSON_MARKDOWN_HEADERS } from './lesson-markdown-response';
import { courseMarkdownPath, coursePath, LEARN_COURSES_PATH, LEARN_HOME_PATH } from './paths';

/** A course's copy as Markdown, by the course's state (`course-share.ts`); a moved one goes to its new copy. */
export async function courseMarkdownResponse(slug: string, state: () => Promise<CourseShareState>): Promise<Response> {
  let found: CourseShareState;
  try {
    found = await state();
  } catch {
    return courseUnavailableResponse();
  }
  if (found.kind !== 'live') return courseNotServedResponse(found, courseMarkdownPath);
  return new Response(learnCourseMarkdownOf(found.course), {
    headers: { ...LESSON_MARKDOWN_HEADERS, Link: `<${coursePath(slug)}>; rel="canonical"` },
  });
}

/** The copy of all courses as Markdown, from the list as everyone reads it. */
export async function coursesMarkdownResponse(courses: () => Promise<LearnCourseCard[]>): Promise<Response> {
  let read: LearnCourseCard[];
  try {
    read = await courses();
  } catch {
    return courseUnavailableResponse();
  }
  return new Response(learnCoursesMarkdownOf(read), {
    headers: { ...LESSON_MARKDOWN_HEADERS, Link: `<${LEARN_COURSES_PATH}>; rel="canonical"` },
  });
}

/**
 * The landing's copy as Markdown (`/learn.md`): the landing's words with every course, or without the courses when
 * they cannot be read.
 */
export async function landingMarkdownResponse(courses: () => Promise<LearnCourseCard[]>): Promise<Response> {
  const read = await courses().catch(() => []);
  return new Response(learnLandingMarkdownOf(read), {
    headers: { ...LESSON_MARKDOWN_HEADERS, Link: `<${LEARN_HOME_PATH}>; rel="canonical"` },
  });
}
