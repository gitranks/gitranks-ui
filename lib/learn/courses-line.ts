import type { LearnCourseCard } from './course';

/*
 * The line that names Learn's live courses, on Learn's landing and on the home page's Learn card. Pure, with no
 * server-only import, so a client component can draw it.
 */

/** A course as the line needs it. */
export type CourseInLine = Pick<LearnCourseCard, 'slug' | 'name'>;

/**
 * A course's name inside a sentence ("Short lessons on algorithms, JavaScript and TypeScript, ... and LLM APIs"), by
 * its slug; a course not here goes by its own name.
 */
const COURSE_NAMES_IN_A_LINE: Readonly<Record<string, string>> = {
  algorithms: 'algorithms',
  'contributing-to-open-source': 'open source',
  'working-with-llm-apis': 'LLM APIs',
};

/**
 * A course's name on either side of the "and" that joins the list, for a name with its own "and", which would run into
 * it ("algorithms and JavaScript/TypeScript"). Elsewhere in the list the course keeps its name.
 */
const COURSE_NAMES_BY_THE_AND: Readonly<Record<string, string>> = {
  'javascript-and-typescript': 'JavaScript/TypeScript',
};

/** The line names every course up to this many; past it, the first five and how many more. */
export const LANDING_COURSES_NAMED_MAX = 6;
const NAMED_BEFORE_MORE = 5;

/** The line when there is no course to name. */
export const LANDING_COURSES_LINE_EMPTY = 'Short lessons on programming';

const nameInLineOf = (course: CourseInLine) => COURSE_NAMES_IN_A_LINE[course.slug] ?? course.name.trim();

/**
 * "Short lessons on algorithms, JavaScript and TypeScript, Python, open source and LLM APIs": the live courses in
 * their order, every one up to six; past six, the first five "and 2 more courses". No full stop.
 */
export function landingCoursesLineOf(courses: readonly CourseInLine[]): string {
  const named = courses.filter((course) => nameInLineOf(course));
  if (!named.length) return LANDING_COURSES_LINE_EMPTY;
  if (named.length === 1) return `Short lessons on ${nameInLineOf(named[0])}`;
  const byTheAnd = (course: CourseInLine) => COURSE_NAMES_BY_THE_AND[course.slug] ?? nameInLineOf(course);
  if (named.length > LANDING_COURSES_NAMED_MAX) {
    const first = named.slice(0, NAMED_BEFORE_MORE - 1).map(nameInLineOf);
    const fifth = byTheAnd(named[NAMED_BEFORE_MORE - 1]);
    return `Short lessons on ${[...first, fifth].join(', ')} and ${named.length - NAMED_BEFORE_MORE} more courses`;
  }
  const before = named.slice(0, -2).map(nameInLineOf);
  const [second, last] = named.slice(-2).map(byTheAnd);
  return `Short lessons on ${[...before, second].join(', ')} and ${last}`;
}
