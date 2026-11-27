import 'server-only';

import { type InterviewsActionResult, interviewsErrorOf, invalidInterviewsAction } from './interviews-action';
import { InterviewPlanMineDocument, StartInterviewPlanDocument, StopInterviewPlanDocument } from './mine.documents';
import { isInterviewCompanySlug, isInterviewPlanSlug } from './paths';
import { INTERVIEW_STOP_REASONS, type InterviewPlanMine, type InterviewStopReason } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * One plan for the signed-in person: where they stand, and starting and stopping it. Asked for that person alone,
 * never kept.
 */

const isPlanAddress = (company: unknown, plan: unknown): company is string =>
  typeof company === 'string' &&
  isInterviewCompanySlug(company) &&
  typeof plan === 'string' &&
  isInterviewPlanSlug(plan);

/**
 * One plan for the person: null when a slug is not one (without asking the API), when Interviews is not open to them,
 * when the plan is not listed, and on any failure.
 */
export async function loadInterviewPlanMine(
  githubLogin: string,
  company: string,
  plan: string,
): Promise<InterviewPlanMine | null> {
  if (!isPlanAddress(company, plan)) return null;
  try {
    const { interviewPlanMine } = await graphqlDirect(
      InterviewPlanMineDocument,
      { company, plan },
      { source: 'ssr', githubLogin },
    );
    return interviewPlanMine ?? null;
  } catch {
    return null;
  }
}

/** The plan as the API answers a start or a stop; a missing answer is a plan it does not know. */
const planResultOf = (mine: InterviewPlanMine | null | undefined): InterviewsActionResult<InterviewPlanMine> =>
  mine ? { ok: true, data: mine } : { ok: false, error: 'NOT_FOUND' };

/**
 * Starts a plan for the person (`{ company, plan }`), or starts a stopped one again: the plan for them, as the read
 * answers it. A body not of that shape is `INVALID` before the API is asked.
 */
export async function startInterviewPlan(
  githubLogin: string,
  body: Record<string, unknown>,
): Promise<InterviewsActionResult<InterviewPlanMine>> {
  const { company, plan } = body;
  if (!isPlanAddress(company, plan)) return invalidInterviewsAction();
  try {
    const { startInterviewPlan: mine } = await graphqlDirect(
      StartInterviewPlanDocument,
      { company, plan: plan as string },
      { source: 'ssr', githubLogin },
    );
    return planResultOf(mine);
  } catch (error) {
    return { ok: false, error: interviewsErrorOf(error) };
  }
}

/** Whether a value is one of the reasons the question offers. */
const isStopReason = (reason: unknown): reason is InterviewStopReason =>
  typeof reason === 'string' && (INTERVIEW_STOP_REASONS as readonly string[]).includes(reason);

/**
 * Stops a plan for the person (`{ company, plan, reason }`): `reason` is one the question offers, or null (or left
 * out) when they skipped it. A body not of that shape is `INVALID` before the API is asked.
 */
export async function stopInterviewPlan(
  githubLogin: string,
  body: Record<string, unknown>,
): Promise<InterviewsActionResult<InterviewPlanMine>> {
  const { company, plan, reason = null } = body;
  if (!isPlanAddress(company, plan) || (reason !== null && !isStopReason(reason))) return invalidInterviewsAction();
  try {
    const { stopInterviewPlan: mine } = await graphqlDirect(
      StopInterviewPlanDocument,
      { company, plan: plan as string, reason },
      { source: 'ssr', githubLogin },
    );
    return planResultOf(mine);
  } catch (error) {
    return { ok: false, error: interviewsErrorOf(error) };
  }
}
