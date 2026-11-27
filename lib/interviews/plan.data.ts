import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { interviewCompanyTag, interviewPlanTag, isInterviewCompanySlug, isInterviewPlanSlug } from './paths';
import { InterviewPlanDocument } from './public.documents';
import type { InterviewPlanPage } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * A listed plan's page; null when a slug is not one, and on a failed read. Kept for hours under the plan's tag and its
 * company's (its other plans are cards of the company); a null only for minutes. Never throws (`home.data.ts` says
 * why).
 */
export async function loadInterviewPlan(company: string, plan: string): Promise<InterviewPlanPage | null> {
  'use cache';
  cacheTag(interviewPlanTag(company, plan), interviewCompanyTag(company));
  if (!isInterviewCompanySlug(company) || !isInterviewPlanSlug(plan)) {
    cacheLife('hours');
    return null;
  }
  let page: InterviewPlanPage | null = null;
  try {
    ({ interviewPlan: page } = await graphqlDirect(InterviewPlanDocument, { company, plan }, { source: 'ssr' }));
  } catch {
    page = null;
  }
  if (page) cacheLife('hours');
  else cacheLife('minutes');
  return page ?? null;
}
