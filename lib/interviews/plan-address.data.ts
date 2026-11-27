import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { InterviewAddressDocument } from './interviews.documents';
import {
  interviewCompanyTag,
  interviewPlanTag,
  isInterviewCompanySlug,
  isInterviewPlanSlug,
  isInterviewsPath,
} from './paths';
import type { InterviewAddress } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** An address no plan has: the not-found page. */
const MISSING: InterviewAddress = { state: 'missing', to: null };

/** A new address the page may send a person to: a path of Interviews' own, never another site. */
const isMovedTo = (to: string | null): to is string =>
  !!to && to.startsWith('/') && !to.startsWith('//') && isInterviewsPath(to);

/**
 * Where a plan's address stands, asked when the plan's page is not there: moved (with its new address), gone (taken
 * down or removed), or missing. Kept under the plan's and its company's tags: for hours once known, for minutes when
 * missing or on a failed read. A slug that is not one asks nothing. Never throws.
 */
export async function loadInterviewPlanAddress(company: string, plan: string): Promise<InterviewAddress> {
  'use cache';
  cacheTag(interviewPlanTag(company, plan), interviewCompanyTag(company));
  if (!isInterviewCompanySlug(company) || !isInterviewPlanSlug(plan)) {
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
  const known =
    address?.state === 'gone'
      ? { state: 'gone' as const, to: null }
      : address?.state === 'moved' && isMovedTo(address.to)
        ? { state: 'moved' as const, to: address.to }
        : null;
  if (known) cacheLife('hours');
  else cacheLife('minutes');
  return known ?? MISSING;
}
