import 'server-only';

import { type InterviewsActionResult, interviewsErrorOf, invalidInterviewsAction } from './interviews-action';
import { ReportInterviewFactDocument } from './mine.documents';
import { isInterviewCompanySlug, isInterviewPlanSlug } from './paths';
import { reportNoteOf } from './report';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** The longest a fact's key may be: a place in the research, such as `software-engineer/senior/rounds/3`. */
const FACT_KEY_MAX_LENGTH = 200;
const FACT_KEY = /^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/;

/**
 * Sends one "This is wrong" for the signed-in person (`{ company, plan, fact, note }`): `plan` names the plan it was
 * sent from, or is left out on a company's page. A body not of that shape is `INVALID` before the API is asked; past
 * the day's limit, `LIMITED`. Never kept.
 */
export async function reportInterviewFact(
  githubLogin: string,
  body: Record<string, unknown>,
): Promise<InterviewsActionResult<boolean>> {
  const { company, plan = null, fact } = body;
  const note = reportNoteOf(body.note);
  if (
    typeof company !== 'string' ||
    !isInterviewCompanySlug(company) ||
    (plan !== null && (typeof plan !== 'string' || !isInterviewPlanSlug(plan))) ||
    typeof fact !== 'string' ||
    fact.length > FACT_KEY_MAX_LENGTH ||
    !FACT_KEY.test(fact) ||
    note === null
  ) {
    return invalidInterviewsAction();
  }
  try {
    const { reportInterviewFact: sent } = await graphqlDirect(
      ReportInterviewFactDocument,
      { company, plan, fact, note },
      { source: 'ssr', githubLogin },
    );
    return sent === true ? { ok: true, data: true } : { ok: false, error: 'NOT_FOUND' };
  } catch (error) {
    return { ok: false, error: interviewsErrorOf(error) };
  }
}
