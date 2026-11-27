import type { InterviewsForCourses } from '@/lib/interviews/types';
import type { LearnCourse, LearnCourseCard } from '@/lib/learn/course';
import type { CoursesInterviews } from '@/lib/learn/courses-interviews';

/*
 * Interviews on the list of all courses: the public answer for Learn's Courses page turned into what Learn's list
 * draws. The one place Learn's list and Interviews meet, with the parts in `courses-gate.tsx`.
 */

/** The person's route that answers it in the browser, while Interviews is not open to everyone. */
export const COURSES_INTERVIEWS_MINE_PATH = '/api/me/learn/interviews';

/** A course as the list's card shows it, from the course whole. */
export const courseCardOf = (course: LearnCourseCard | LearnCourse): LearnCourseCard => ({
  slug: course.slug,
  name: course.name,
  kind: course.kind,
  covers: course.covers,
  languages: course.languages,
  lessons: course.lessons,
  numbers: { learners: course.numbers.learners, goodShare: course.numbers.goodShare },
  project: course.project ?? null,
  section: course.section ?? null,
});

/**
 * What the list shows of Interviews: the top five, the companies with the courses their plans use, and the cards of
 * the section's courses found among `cards`, in the answer's order. Null with no company and no course of the section:
 * the list is then as it is today.
 */
export function coursesInterviewsOf(
  answer: InterviewsForCourses,
  cards: readonly LearnCourseCard[],
): CoursesInterviews | null {
  const cardOf = new Map(cards.map((card) => [card.slug, card]));
  const section = answer.section.flatMap(({ slug, company }) => {
    const card = cardOf.get(slug);
    return card ? [{ course: courseCardOf(card), company }] : [];
  });
  const companies = answer.companies.filter((entry) => entry.courses.length > 0);
  if (!answer.top.length && !companies.length && !section.length) return null;
  return { top: answer.top.slice(0, 5), companies, section };
}

/** An answer of the route as the list can draw it, or null. */
export function coursesInterviewsFrom(value: unknown): CoursesInterviews | null {
  if (!value || typeof value !== 'object') return null;
  const { top, companies, section } = value as Record<string, unknown>;
  return Array.isArray(top) && Array.isArray(companies) && Array.isArray(section) ? (value as CoursesInterviews) : null;
}
