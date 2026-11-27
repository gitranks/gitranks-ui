import { countWords, type FoundCourse, isWholeNameOf, type LearnCourseCard, lessonsWords } from './course';

/*
 * What the list of all courses shows of Interviews, as Learn reads it: the top five companies for the row under the
 * search, every company with the courses its interview plans use, and the courses of the section Interviews. Pure.
 * The page draws it only once Interviews is open to the viewer.
 */

/** A company as the list names it: its slug, its name, and whether it has a logo. */
export type CoursesCompany = { slug: string; name: string; logo: boolean };

/** A course one company's plans use: the names of the rounds it prepares for, and how many of its live lessons. */
export type CoursesCompanyCourse = { slug: string; rounds: string[]; lessons: number };

/** What the list of all courses shows of Interviews. */
export type CoursesInterviews = {
  /** The top five companies, in order, for the row under the search. */
  top: CoursesCompany[];
  /** Every company with its other names and the courses its plans use. */
  companies: { company: CoursesCompany; otherNames: string[]; courses: CoursesCompanyCourse[] }[];
  /** The courses of the section Interviews, in order, each with its company: none for Interview skills. */
  section: { course: LearnCourseCard; company: CoursesCompany | null }[];
};

/** How one company's plans use a course, as its card says it: the company, then "Coding interviews · 48 lessons". */
export type CourseCompanyUse = { company: CoursesCompany; line: string };

/** A name with its first letter small, unless the word is written in capitals ("AI interview" stays). */
function lowerFirst(name: string): string {
  const [first, second] = Array.from(name);
  if (!first || (second && second !== second.toLowerCase())) return name;
  return first.toLowerCase() + name.slice(first.length);
}

/** The rounds in one phrase: "Phone screen and coding interviews", "Recruiter call, values and system design". */
export function roundsWordsOf(rounds: readonly string[]): string {
  const names = rounds.map((round, index) => (index ? lowerFirst(round.trim()) : round.trim())).filter(Boolean);
  if (names.length < 2) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The line of a course a company's plans use: its rounds, then how many of its lessons, "all 18 lessons" when they use
 * every one. A part with nothing in it is left out, so no zero is written.
 */
export function companyUseLineOf(use: Pick<CoursesCompanyCourse, 'rounds' | 'lessons'>, courseLessons: number): string {
  const lessons =
    use.lessons <= 0
      ? ''
      : use.lessons >= courseLessons && courseLessons > 1
        ? `all ${countWords(courseLessons)} lessons`
        : lessonsWords(use.lessons);
  return [roundsWordsOf(use.rounds), lessons].filter(Boolean).join(' · ');
}

/**
 * The courses the typed company's plans use, by course: a company is found by its whole name or one of its other
 * names, case and accents ignored; part of a name finds none. Empty with nothing of Interviews, and for a course not
 * on the list.
 */
export function courseCompanyUsesOf(
  interviews: CoursesInterviews | null,
  query: string,
  courses: readonly LearnCourseCard[],
): Map<string, CourseCompanyUse[]> {
  const uses = new Map<string, CourseCompanyUse[]>();
  if (!interviews) return uses;
  const lessonsOf = new Map(courses.map((course) => [course.slug, course.lessons]));
  for (const { company, otherNames, courses: used } of interviews.companies) {
    if (![company.name, ...otherNames].some((name) => isWholeNameOf(name, query))) continue;
    for (const course of used) {
      const lessons = lessonsOf.get(course.slug);
      if (lessons === undefined) continue;
      uses.set(course.slug, [...(uses.get(course.slug) ?? []), { company, line: companyUseLineOf(course, lessons) }]);
    }
  }
  return uses;
}

/**
 * Every course the list shows: the API's list, then the courses of the section Interviews in the section's order. A
 * course in both is drawn once, in the section's place.
 */
export function coursesWithInterviewsOf(
  courses: readonly LearnCourseCard[],
  interviews: CoursesInterviews | null,
): readonly LearnCourseCard[] {
  if (!interviews?.section.length) return courses;
  const inSection = new Set(interviews.section.map(({ course }) => course.slug));
  return [
    ...courses.filter((course) => !inSection.has(course.slug)),
    ...interviews.section.map(({ course }) => course),
  ];
}

/** The company of each course of the section Interviews, by slug. */
export const sectionCompaniesOf = (interviews: CoursesInterviews | null) =>
  new Map((interviews?.section ?? []).flatMap(({ course, company }) => (company ? [[course.slug, company]] : [])));

/** With more courses than this, the section Interviews shows Interview skills and the top five's, then a button. */
export const INTERVIEWS_SECTION_SHOWN_UP_TO = 12;

/**
 * The courses the section Interviews shows. With a search, or up to 12 courses: every one. Else the courses of no
 * company (Interview skills), then those of the top five companies in their order; the rest wait for the button.
 */
export function interviewsSectionShownOf(
  found: readonly FoundCourse[],
  interviews: CoursesInterviews | null,
  { searched }: { searched: boolean },
): readonly FoundCourse[] {
  if (searched || found.length <= INTERVIEWS_SECTION_SHOWN_UP_TO || !interviews) return found;
  const companyOf = sectionCompaniesOf(interviews);
  const general = found.filter(({ course }) => !companyOf.has(course.slug));
  const top = interviews.top.flatMap((company) =>
    found.filter(({ course }) => companyOf.get(course.slug)?.slug === company.slug),
  );
  return [...general, ...top];
}
