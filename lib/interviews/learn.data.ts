import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { INTERVIEWS_COURSES_TAG, interviewCourseTag, isInterviewSlug } from './paths';
import { InterviewsForCourseDocument, InterviewsForCoursesDocument } from './public.documents';
import type { InterviewsForCourse, InterviewsForCourses } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * What Learn's pages show of Interviews, read the same way as Interviews' own public pages (`home.data.ts`): cached,
 * never throwing, an empty answer kept for minutes.
 */

/** Learn's Courses page with nothing of Interviews: what a failed read gives. */
export const EMPTY_INTERVIEWS_FOR_COURSES: InterviewsForCourses = { top: [], companies: [], section: [] };

/** One Learn course with nothing of Interviews: what a failed read gives. */
export const EMPTY_INTERVIEWS_FOR_COURSE: InterviewsForCourse = { companies: [], groups: [], own: null };

/** What Learn's Courses page shows of Interviews. Hours when a company or a course is in it; minutes otherwise. */
export async function loadInterviewsForCourses(): Promise<InterviewsForCourses> {
  'use cache';
  cacheTag(INTERVIEWS_COURSES_TAG);
  let answer: InterviewsForCourses | null = null;
  try {
    ({ interviewsForCourses: answer } = await graphqlDirect(InterviewsForCoursesDocument, {}, { source: 'ssr' }));
  } catch {
    answer = null;
  }
  if (answer && (answer.companies?.length || answer.section?.length)) {
    cacheLife('hours');
    return answer;
  }
  cacheLife('minutes');
  return EMPTY_INTERVIEWS_FOR_COURSES;
}

/**
 * What one Learn course's pages show of Interviews. Hours for a real answer, a course no plan uses included; minutes
 * for a failed read.
 */
export async function loadInterviewsForCourse(course: string): Promise<InterviewsForCourse> {
  'use cache';
  cacheTag(interviewCourseTag(course));
  if (!isInterviewSlug(course)) {
    cacheLife('hours');
    return EMPTY_INTERVIEWS_FOR_COURSE;
  }
  let answer: InterviewsForCourse | null = null;
  try {
    ({ interviewsForCourse: answer } = await graphqlDirect(InterviewsForCourseDocument, { course }, { source: 'ssr' }));
  } catch {
    answer = null;
  }
  if (answer) {
    cacheLife('hours');
    return answer;
  }
  cacheLife('minutes');
  return EMPTY_INTERVIEWS_FOR_COURSE;
}
