import 'server-only';

import { InterviewNextDocument } from './mine.documents';
import { isInterviewCompanySlug, isInterviewPartKey, isInterviewPlanSlug } from './paths';
import type { InterviewNext } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * The connecting screen for the signed-in person, after one part of a plan (`after`: the part's key): what was just
 * done, and the plan for them now. Null when a slug or the key is not of its shape (without asking the API), when
 * Interviews is not open to them, when the plan is not listed, and on any failure. Asked for that person alone, never
 * kept.
 */
export async function loadInterviewNext(
  githubLogin: string,
  company: string,
  plan: string,
  after: string,
): Promise<InterviewNext | null> {
  if (!isInterviewCompanySlug(company) || !isInterviewPlanSlug(plan) || !isInterviewPartKey(after)) return null;
  try {
    const { interviewNext } = await graphqlDirect(
      InterviewNextDocument,
      { company, plan, after },
      { source: 'ssr', githubLogin },
    );
    return interviewNext ?? null;
  } catch {
    return null;
  }
}
