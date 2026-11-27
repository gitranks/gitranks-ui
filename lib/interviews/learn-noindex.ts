import type { Metadata } from 'next';

import { INTERVIEWS_OPEN_TO_EVERYONE } from './interviews-parts';

/*
 * Learn's courses of the section Interviews, and their lessons, answer by their address while Interviews is closed
 * (an interview plan opens them), but no search engine indexes them until Interviews is open to everyone.
 */

/** What a course says of its section: Learn's course or card, read by its slug. */
type SectionOf = { kind?: string; section?: string | null };

/** Whether a course is of the section Interviews: a company course, or a course that says so (Interview skills). */
export const isInterviewsSectionCourse = (course: SectionOf | null | undefined): boolean =>
  !!course && (course.section === 'INTERVIEWS' || course.kind === 'COMPANY');

/** A page of such a course, or one of its lessons: `noindex, nofollow` while Interviews is not open to everyone. */
export function withInterviewsSectionNoindex(metadata: Metadata, course: SectionOf | null | undefined): Metadata {
  return !INTERVIEWS_OPEN_TO_EVERYONE && isInterviewsSectionCourse(course)
    ? { ...metadata, robots: { index: false, follow: false } }
    : metadata;
}
