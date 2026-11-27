import { type CourseBoxes, type LearnCourse, lessonsWords } from './course';
import type { CoursesCompany } from './courses-interviews';

/*
 * What a course's page and its lessons show of Interviews, as Learn reads it: the companies whose interview plans use
 * the course, the companies that report each group's topic, and for a company's own course the company and its plans.
 * Pure. The page draws it only once Interviews is open to the viewer.
 */

/** Who states that a topic is asked: the company's own pages, candidates' reports, or both. */
export type CourseTopicBasis = 'official' | 'reported' | 'both';

/** One group whose topic is asked: the topic as a sentence says it ("graphs"), the companies, and who states it. */
export type CourseInterviewsGroup = {
  group: string;
  topic: string;
  companies: CoursesCompany[];
  basis: CourseTopicBasis;
};

/**
 * A company's own course: the company, the day its facts were checked ("26 Nov 2026"; null when not known), how many
 * plans it has and where they are, and where its research is explained.
 */
export type CourseCompanyOwn = {
  company: CoursesCompany;
  checked: string | null;
  plans: number;
  plansHref: string;
  researchHref: string;
};

/** What a course's page shows of Interviews. */
export type CourseInterviews = {
  /** The companies whose interview plans use the course, for the line under its row of facts. */
  companies: CoursesCompany[];
  /** The groups whose topic is asked: "Asked at" on the group's line, and the sentence of its lessons. */
  groups: CourseInterviewsGroup[];
  /** A company's own course; null for any other course. */
  own: CourseCompanyOwn | null;
};

/** The group's entry, with at least one company; none when nothing is said of the group. */
export const courseGroupInterviewsOf = (
  interviews: CourseInterviews | null | undefined,
  group: string,
): CourseInterviewsGroup | null =>
  interviews?.groups.find((entry) => entry.group === group && entry.companies.length > 0 && entry.topic.trim()) ?? null;

/**
 * The lessons in the row of facts of a company's own course: "18 lessons, one group for each round", or the count alone
 * with one group.
 */
export const companyCourseLessonsFactOf = (course: Pick<LearnCourse, 'lessons' | 'groups'>): string =>
  course.groups.length > 1 ? `${lessonsWords(course.lessons)}, one group for each round` : lessonsWords(course.lessons);

/** The sentence under a company's own course's name ends with the notice. */
export const companyCourseNoticeOf = (own: Pick<CourseCompanyOwn, 'company'>): string =>
  `Not an official ${own.company.name} page.`;

/**
 * The boxes of a company's own course: its plans in the middle, where other courses have the check. Lessons due take
 * the place as on any course, and the plans never take the highlight; a company with no plan keeps the boxes as they
 * are.
 */
export function companyPlansBoxesOf(boxes: CourseBoxes, own: CourseCompanyOwn | null | undefined): CourseBoxes {
  if (!own || own.plans <= 0 || boxes.middle.kind === 'due' || boxes.highlight === 'middle') return boxes;
  return {
    ...boxes,
    middle: { kind: 'plans', company: own.company.name, plans: own.plans, href: own.plansHref },
  };
}

/** The middle box's button: "See Northwind’s 6 plans", "See Northwind’s plan". */
export const companyPlansButtonOf = (company: string, plans: number): string =>
  plans === 1 ? `See ${company}’s plan` : `See ${company}’s ${plans} plans`;
