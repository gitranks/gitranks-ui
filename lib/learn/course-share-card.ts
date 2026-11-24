import { countWords, type LearnCourse, type LearnCourseCard, learnersOf } from './course';
import { languageNameOf, languageNamesOf } from './learn-question';
import { type CourseRef, courseCardHrefOf, courseHrefOf, LEARN_COURSES_CARD_PATH, LEARN_COURSES_PATH } from './paths';

/*
 * The share pictures of a course and of all courses (page 21): where each lives, and what each says. Pure and free of
 * server reads, so the cards, the metadata and the design catalogue use the same rules. No zero on a card.
 */

/** A figure on a picture: its number and its label. */
export type CardFigure = { value: string; label: string };

/** What a course's picture reads. */
type CardCourse = Pick<
  LearnCourse,
  'slug' | 'name' | 'kind' | 'languages' | 'lessons' | 'numbers' | 'changedAt' | 'project'
>;

/** A short, stable hash of a text (32-bit FNV-1a), in base 36. */
function hashOf(text: string): string {
  let hash = 0x811c9dc5;
  for (let at = 0; at < text.length; at++) {
    hash ^= text.charCodeAt(at);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/**
 * The line under a course's name: a topic course with its languages, the language of a language course, or a
 * project course's kind with the project's language.
 */
export function courseCardSubOf(course: Pick<LearnCourse, 'kind' | 'languages'>): string {
  const [first] = course.languages;
  if (course.kind === 'REPOSITORY' || course.kind === 'ORG') {
    const kind = course.kind === 'REPOSITORY' ? 'A repository course' : 'An org course';
    return first ? `${kind}, in ${languageNameOf(first)}` : kind;
  }
  if (course.kind === 'LANGUAGE') {
    return first ? `A language course: ${languageNamesOf(course.languages)}` : 'A language course';
  }
  const count = course.languages.length;
  if (count === 1 && first) return `A topic course, with examples in ${languageNameOf(first)}`;
  return count > 1 ? `A topic course, with examples in ${countWords(count)} languages` : 'A topic course';
}

/** A course's real issues fixed are drawn from this many: fewer leave the place empty. */
const ISSUES_FIXED_SHOWN_FROM = 5;

/** The merged fixes that used a lesson of the course, when worth showing: from 5. */
export function issuesFixedOf(numbers: Pick<LearnCourse['numbers'], 'issuesFixed'>): number | null {
  const fixed = numbers.issuesFixed;
  return typeof fixed === 'number' && Number.isInteger(fixed) && fixed >= ISSUES_FIXED_SHOWN_FROM ? fixed : null;
}

/** A course's figures: its lessons, its learners from 10, and the real issues fixed with it from 5. None is a zero. */
export function courseCardFiguresOf(course: Pick<LearnCourse, 'lessons' | 'numbers'>): CardFigure[] {
  const figures: CardFigure[] = [];
  if (course.lessons > 0) {
    figures.push({ value: countWords(course.lessons), label: course.lessons === 1 ? 'lesson' : 'lessons' });
  }
  const learners = learnersOf(course.numbers);
  if (learners !== null) figures.push({ value: countWords(learners), label: 'learners' });
  const fixed = issuesFixedOf(course.numbers);
  if (fixed !== null) figures.push({ value: countWords(fixed), label: 'real issues fixed with it' });
  return figures;
}

/** The figures of all courses: how many courses, and how many lessons in them. None is a zero. */
export function coursesCardFiguresOf(courses: readonly Pick<LearnCourseCard, 'lessons'>[]): CardFigure[] {
  const lessons = courses.reduce((sum, course) => sum + Math.max(0, course.lessons), 0);
  const figures: CardFigure[] = [];
  if (courses.length > 0) {
    figures.push({ value: countWords(courses.length), label: courses.length === 1 ? 'course' : 'courses' });
  }
  if (lessons > 0) figures.push({ value: countWords(lessons), label: lessons === 1 ? 'lesson' : 'lessons' });
  return figures;
}

/** The headline of the picture every other Learn page shows: the board's first sentence (its second is wave 2's). */
export const LEARN_CARD_HEADLINE = 'Learn one idea in two minutes.';

/** A course picture's version: a hash of what it draws. A change to anything it shows is a new address. */
export function courseCardVersionOf(course: CardCourse): string {
  const figures = courseCardFiguresOf(course).map((figure) => `${figure.value} ${figure.label}`);
  return hashOf(['course', course.changedAt, course.name, courseCardSubOf(course), ...figures].join('\n'));
}

/** The picture of all courses' version: a hash of its figures. */
export function coursesCardVersionOf(courses: readonly Pick<LearnCourseCard, 'lessons'>[]): string {
  const figures = coursesCardFiguresOf(courses).map((figure) => `${figure.value} ${figure.label}`);
  return hashOf(['courses', LEARN_CARD_HEADLINE, ...figures].join('\n'));
}

/** A course's picture, under its one current address. */
export const learnCourseCardUrlOf = (course: CardCourse) =>
  `${courseCardHrefOf(course)}?v=${courseCardVersionOf(course)}`;
/** The picture of all courses, under its one current address. */
export const learnCoursesCardUrlOf = (courses: readonly Pick<LearnCourseCard, 'lessons'>[]) =>
  `${LEARN_COURSES_CARD_PATH}?v=${coursesCardVersionOf(courses)}`;

/** The address printed on a course's picture, and on that of all courses: the page, without the scheme. */
export const courseCardAddressOf = (course: CourseRef) => `gitranks.com${courseHrefOf(course)}`;
export const COURSES_CARD_ADDRESS = `gitranks.com${LEARN_COURSES_PATH}`;

/** The name's size on a course's picture: smaller in two steps for a long name, so it keeps to two lines. */
export const courseCardTitleSize = (name: string) => (name.length > 48 ? 46 : name.length > 32 ? 54 : 62);

/** A course's preview description: how many lessons, and what each is. */
export const courseShareDescriptionOf = (course: Pick<LearnCourse, 'lessons'>) =>
  course.lessons < 1
    ? 'Short lessons, each with one question.'
    : course.lessons === 1
      ? 'One short lesson, with one question.'
      : `${countWords(course.lessons)} short lessons, each with one question.`;
