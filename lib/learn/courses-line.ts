import type { LearnCourseCard } from './course';

/*
 * The line that names Learn's live courses, on Learn's landing and on the home page's Learn card. Pure, with no
 * server-only import, so a client component can draw it.
 */

/** A course as the line needs it. */
export type CourseInLine = Pick<LearnCourseCard, 'slug' | 'name'>;

/**
 * A course's name inside a sentence ("Short lessons on algorithms, ... open source and LLM APIs"), by its slug; a
 * course not here goes by its own name.
 */
const COURSE_NAMES_IN_A_LINE: Readonly<Record<string, string>> = {
  algorithms: 'algorithms',
  'contributing-to-open-source': 'open source',
  'working-with-llm-apis': 'LLM APIs',
};

/** The line names every course up to this many; past it, the first five and how many more. */
export const LANDING_COURSES_NAMED_MAX = 6;
const NAMED_BEFORE_MORE = 5;

/** The line when there is no course to name. */
export const LANDING_COURSES_LINE_EMPTY = 'Short lessons on programming';

/**
 * "Short lessons on algorithms, JavaScript and TypeScript, Python, open source and LLM APIs": the live courses in
 * their order, every one up to six; past six, the first five "and 2 more courses". No full stop.
 */
export function landingCoursesLineOf(courses: readonly CourseInLine[]): string {
  const names = courses.map((course) => COURSE_NAMES_IN_A_LINE[course.slug] ?? course.name.trim()).filter(Boolean);
  if (!names.length) return LANDING_COURSES_LINE_EMPTY;
  const shown =
    names.length > LANDING_COURSES_NAMED_MAX
      ? [...names.slice(0, NAMED_BEFORE_MORE), `${names.length - NAMED_BEFORE_MORE} more courses`]
      : names;
  const list = shown.length === 1 ? shown[0] : `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
  return `Short lessons on ${list}`;
}
