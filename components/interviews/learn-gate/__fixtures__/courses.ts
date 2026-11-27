import { coursesInterviewsOf } from '../courses-interviews';
import { forCourses } from '@/lib/interviews/__fixtures__/learn';
import type { InterviewCompanyRef, InterviewsForCourses } from '@/lib/interviews/types';
import type { LearnCourseCard } from '@/lib/learn/course';
import type { CoursesInterviews } from '@/lib/learn/courses-interviews';

/*
 * Learn's list of all courses with Interviews, from the two made-up companies: the cards of the section's two courses
 * (read by their slugs while the list leaves them out), the list's part as the page draws it, and a hundred companies.
 */

const NO_NUMBERS = { learners: null, goodShare: null };

/** Interview skills: a topic course of the section Interviews, with no code. */
export const interviewSkillsCard: LearnCourseCard = {
  slug: 'interview-skills',
  name: 'Interview skills',
  kind: 'TOPIC',
  covers: 'Think aloud, ask before you code, test by hand',
  languages: [],
  lessons: 11,
  numbers: NO_NUMBERS,
  project: null,
  section: 'INTERVIEWS',
};

/** Northwind's own course. */
export const northwindCourseCard: LearnCourseCard = {
  slug: 'interviewing-at-northwind',
  name: 'Interviewing at Northwind',
  kind: 'COMPANY',
  covers: 'Its rounds, what each one checks and how to get ready',
  languages: [],
  lessons: 12,
  numbers: NO_NUMBERS,
  project: null,
  section: 'INTERVIEWS',
};

/** The section's two cards. */
export const sectionCards = [interviewSkillsCard, northwindCourseCard];

/** What the list shows of the two companies. */
export const coursesInterviews = coursesInterviewsOf(forCourses, sectionCards) as CoursesInterviews;

/** Only Northwind and Tallgrass have plans, with no course of the section written yet. */
export const twoCompaniesNoSection: CoursesInterviews = { ...coursesInterviews, section: [] };

/** A made-up company of the hundred: "Company 7", `company-7`. */
const companyAt = (n: number): InterviewCompanyRef => ({
  slug: `company-${n}`,
  name: `Company ${n}`,
  logo: n % 2 === 0,
});

/** A company's own course card, of the hundred. */
const companyCourseAt = (n: number): LearnCourseCard => ({
  ...northwindCourseCard,
  slug: `interviewing-at-company-${n}`,
  name: `Interviewing at Company ${n}`,
  lessons: 10 + (n % 7),
});

/** A hundred companies, each with its own course; the top five are 3, 1, 4, 5 and 9, and the API lists 1 to 100. */
const hundred = Array.from({ length: 100 }, (_, index) => index + 1);
export const hundredForCourses: InterviewsForCourses = {
  top: [3, 1, 4, 5, 9].map(companyAt),
  companies: hundred.map((n) => ({
    company: companyAt(n),
    otherNames: [],
    courses: [{ slug: `interviewing-at-company-${n}`, rounds: ['Values interview'], lessons: 4 }],
  })),
  section: [
    { slug: 'interview-skills', name: 'Interview skills', lessons: 11, company: null },
    ...hundred.map((n) => ({
      slug: `interviewing-at-company-${n}`,
      name: `Interviewing at Company ${n}`,
      lessons: 10,
      company: companyAt(n),
    })),
  ],
};
export const hundredCards = [interviewSkillsCard, ...hundred.map(companyCourseAt)];
export const hundredCompanies = coursesInterviewsOf(hundredForCourses, hundredCards) as CoursesInterviews;
