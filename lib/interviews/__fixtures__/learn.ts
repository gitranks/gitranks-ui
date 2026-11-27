import type { InterviewsForCourse, InterviewsForCourses } from '../types';
import { CHECKED_AT, northwind, northwindPlanCards, tallgrass } from './companies';

/* What Learn's pages show of the two made-up companies: Courses, a topic course and Northwind's own course. */

/** Learn's Courses: the top five, each company with the courses its plans use, and the Interviews section's cards. */
export const forCourses: InterviewsForCourses = {
  top: [northwind, tallgrass],
  companies: [
    {
      company: northwind,
      otherNames: ['Northwind Labs'],
      courses: [
        { slug: 'algorithms', rounds: ['Online assessment', 'Coding interviews'], lessons: 32 },
        { slug: 'system-design-basics', rounds: ['System design'], lessons: 16 },
        { slug: 'interview-skills', rounds: ['Recruiter call', 'Coding interviews'], lessons: 11 },
        { slug: 'interviewing-at-northwind', rounds: ['Values interview'], lessons: 6 },
      ],
    },
    {
      company: tallgrass,
      otherNames: [],
      courses: [
        { slug: 'interview-skills', rounds: ['Recruiter call'], lessons: 6 },
        { slug: 'linux-basics', rounds: ['Systems interview'], lessons: 10 },
      ],
    },
  ],
  section: [
    { slug: 'interview-skills', name: 'Interview skills', lessons: 11, company: null },
    { slug: 'interviewing-at-northwind', name: 'Interviewing at Northwind', lessons: 12, company: northwind },
  ],
};

/** A topic course: Northwind's plans use it, and candidates report two of its groups' topics there. */
export const forAlgorithms: InterviewsForCourse = {
  companies: [northwind],
  groups: [
    { group: 'graphs', topic: 'graphs', companies: [northwind], basis: 'both' },
    { group: 'dynamic-programming', topic: 'dynamic programming', companies: [northwind], basis: 'reported' },
  ],
  own: null,
};

/** Northwind's own course: the company, the day its facts were checked, and its plans. */
export const forNorthwindCourse: InterviewsForCourse = {
  companies: [northwind],
  groups: [],
  own: { company: northwind, checkedAt: CHECKED_AT, plans: northwindPlanCards },
};

/** A course no plan uses. */
export const forNoPlan: InterviewsForCourse = { companies: [], groups: [], own: null };
