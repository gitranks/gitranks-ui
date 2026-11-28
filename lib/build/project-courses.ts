import type { BuildProjectPage } from './types';

/*
 * The Learn courses that help with a project, as its page lists them under "Before you start" and names the first in
 * "What next": the project names each course; Learn's list of courses gives its line and how many lessons it has. A
 * course the list does not have (a failed read) keeps its name alone: nothing is guessed.
 */

/** What Learn's list of courses says of one course: its line and how many lessons it has. */
export type BuildCourseFacts = { slug: string; covers: string | null; lessons: number | null };

/** One course's row: its slug and name, and, when Learn's list has it, its line and its lessons. */
export type ProjectCourseRow = { slug: string; name: string; line: string | null; lessons: number | null };

/** The project's courses in its order, each with what Learn's list says of it. */
export function courseRowsOf(
  project: Pick<BuildProjectPage, 'courses'>,
  cards: readonly BuildCourseFacts[],
): ProjectCourseRow[] {
  const bySlug = new Map(cards.map((card) => [card.slug, card]));
  return project.courses.map((course) => {
    const card = bySlug.get(course.slug);
    const line = card?.covers?.trim() || null;
    const count = card?.lessons;
    const lessons = typeof count === 'number' && Number.isInteger(count) && count > 0 ? count : null;
    return { slug: course.slug, name: course.name, line, lessons };
  });
}

/** "70 lessons", "1 lesson"; null when the count is not known. */
export const lessonsWordsOf = (lessons: number | null): string | null =>
  lessons === null ? null : `${lessons.toLocaleString('en-US')} ${lessons === 1 ? 'lesson' : 'lessons'}`;

/** The line of "What next"'s door to a course: "A Learn course · 70 lessons", or without the count when not known. */
export const courseDoorLineOf = (row: ProjectCourseRow | undefined): string => {
  const lessons = row ? lessonsWordsOf(row.lessons) : null;
  return lessons ? `A Learn course · ${lessons}` : 'A Learn course';
};
