import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { InterviewAddressDocument } from './interviews.documents';
import { interviewCompanyTag, interviewPlanTag, isInterviewCompanySlug, isInterviewPlanSlug } from './paths';
import type { InterviewAddress } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** The state of an address no company or plan can have: nothing is asked. */
const MISSING: InterviewAddress = { state: 'missing', to: null };

/**
 * Where a company's address (`plan` null) or a plan's stands: live, moved, gone or missing. The same for everyone,
 * kept for hours under the company's tag (and the plan's); a failed read is null, kept for minutes. Never throws.
 */
export async function loadInterviewAddress(company: string, plan: string | null): Promise<InterviewAddress | null> {
  'use cache';
  cacheTag(interviewCompanyTag(company));
  if (plan !== null) cacheTag(interviewPlanTag(company, plan));
  if (!isInterviewCompanySlug(company) || (plan !== null && !isInterviewPlanSlug(plan))) {
    cacheLife('hours');
    return MISSING;
  }
  let address: InterviewAddress | null = null;
  try {
    ({ interviewAddress: address } = await graphqlDirect(
      InterviewAddressDocument,
      { company, plan },
      { source: 'ssr' },
    ));
  } catch {
    address = null;
  }
  if (address) cacheLife('hours');
  else cacheLife('minutes');
  return address ?? null;
}
