import { COMPANY_REF, doc, FACT, PLAN_CARD, POSITION, ROUND, SOURCE } from './interviews.documents';
import type {
  InterviewCompanyPage,
  InterviewPlanPage,
  InterviewsForCourse,
  InterviewsForCourses,
  InterviewsHome,
} from './types';

/* Interviews' public reads: the same for everyone, asked with no viewer, and kept for hours. */

/** Interviews home: every listed company with its plans, the positions that have a plan, the top five. */
export const InterviewsHomeDocument = doc<{ interviewsHome: InterviewsHome | null }>(
  `query InterviewsHome { interviewsHome {
    companies { company { ${COMPANY_REF} } otherNames positions { ${POSITION} } plans { ${PLAN_CARD} } }
    positions { ${POSITION} } top { ${COMPANY_REF} }
  } }`,
);

/** A company's page; null when the company is not listed. */
export const InterviewCompanyDocument = doc<{ interviewCompany: InterviewCompanyPage | null }, { company: string }>(
  `query InterviewCompany($company: String!) { interviewCompany(company: $company) {
    company { ${COMPANY_REF} } line checkedAt
    positions { position { ${POSITION} } plans { ${PLAN_CARD} } } leftOut
    process { ${FACT} } values { ${FACT} } official { ${SOURCE} } sources { ${SOURCE} }
    course { slug name lessons } githubOrg courses timeline { ${FACT} } disagreements { count example }
  } }`,
);

/** A plan's page; null when the plan is not listed. */
export const InterviewPlanDocument = doc<
  { interviewPlan: InterviewPlanPage | null },
  { company: string; plan: string }
>(
  `query InterviewPlan($company: String!, $plan: String!) { interviewPlan(company: $company, plan: $plan) {
    ${PLAN_CARD} line checkedAt rounds { ${ROUND} } after { ${FACT} } timeline { ${FACT} } sources { ${SOURCE} }
    others { ${PLAN_CARD} }
  } }`,
);

/** What Learn's Courses page shows of Interviews. */
export const InterviewsForCoursesDocument = doc<{ interviewsForCourses: InterviewsForCourses | null }>(
  `query InterviewsForCourses { interviewsForCourses {
    top { ${COMPANY_REF} }
    companies { company { ${COMPANY_REF} } otherNames courses { slug rounds lessons } }
    section { slug name lessons company { ${COMPANY_REF} } }
  } }`,
);

/** What one Learn course's pages show of Interviews. */
export const InterviewsForCourseDocument = doc<{ interviewsForCourse: InterviewsForCourse | null }, { course: string }>(
  `query InterviewsForCourse($course: String!) { interviewsForCourse(course: $course) {
    companies { ${COMPANY_REF} }
    groups { group topic companies { ${COMPANY_REF} } basis }
    own { company { ${COMPANY_REF} } checkedAt plans { ${PLAN_CARD} } }
  } }`,
);
