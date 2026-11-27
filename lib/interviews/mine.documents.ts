import { doc, PLAN_MINE, PLAN_ROW } from './interviews.documents';
import type { InterviewNext, InterviewPlanMine, InterviewStopReason, InterviewsMine, InterviewsMyHome } from './types';

/*
 * The signed-in person's own reads and writes: asked for that person alone, null when Interviews is not open to them,
 * and never kept.
 */

/** My interviews: the plans in progress, then the finished ones. */
export const InterviewsMineDocument = doc<{ interviewsMine: InterviewsMine | null }>(
  `query InterviewsMine { interviewsMine { inProgress { ${PLAN_ROW} } finished { ${PLAN_ROW} } } }`,
);

/** The person's plans in progress, the one worked on last first: Interviews home, a company's page, Learn home. */
export const InterviewsMyHomeDocument = doc<{ interviewsMyHome: InterviewsMyHome | null }>(
  `query InterviewsMyHome { interviewsMyHome { plans { ${PLAN_ROW} } } }`,
);

/** One plan for the person. */
export const InterviewPlanMineDocument = doc<
  { interviewPlanMine: InterviewPlanMine | null },
  { company: string; plan: string }
>(
  `query InterviewPlanMine($company: String!, $plan: String!) { interviewPlanMine(company: $company, plan: $plan) {
    ${PLAN_MINE}
  } }`,
);

/** The connecting screen, after one part (`after`: the part's key). */
export const InterviewNextDocument = doc<
  { interviewNext: InterviewNext | null },
  { company: string; plan: string; after: string }
>(
  `query InterviewNext($company: String!, $plan: String!, $after: String!) {
    interviewNext(company: $company, plan: $plan, after: $after) { done { kind name lessons } mine { ${PLAN_MINE} } }
  }`,
);

/** Starts a plan, or starts a stopped one again: the plan for the person, as `interviewPlanMine` answers it. */
export const StartInterviewPlanDocument = doc<
  { startInterviewPlan: InterviewPlanMine | null },
  { company: string; plan: string }
>(
  `mutation StartInterviewPlan($company: String!, $plan: String!) {
    startInterviewPlan(company: $company, plan: $plan) { ${PLAN_MINE} }
  }`,
);

/** Stops a plan, with the reason the person picked or none. */
export const StopInterviewPlanDocument = doc<
  { stopInterviewPlan: InterviewPlanMine | null },
  { company: string; plan: string; reason: InterviewStopReason | null }
>(
  `mutation StopInterviewPlan($company: String!, $plan: String!, $reason: String) {
    stopInterviewPlan(company: $company, plan: $plan, reason: $reason) { ${PLAN_MINE} }
  }`,
);

/** One "This is wrong" on one fact (`fact`: its key), from a plan's page or a company's (`plan` null). */
export const ReportInterviewFactDocument = doc<
  { reportInterviewFact: boolean | null },
  { company: string; plan: string | null; fact: string; note: string }
>(
  `mutation ReportInterviewFact($company: String!, $plan: String, $fact: String!, $note: String!) {
    reportInterviewFact(company: $company, plan: $plan, fact: $fact, note: $note)
  }`,
);
