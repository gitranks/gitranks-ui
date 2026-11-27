import type { Route } from 'next';

import { interviewCompanyPath, interviewPlanPath, isInterviewCompanySlug, isInterviewPlanSlug } from './paths';
import type { InterviewAddress } from './types';

/*
 * Where an address that is not a live page leads: a moved one to its new address, anything else to the not-found page.
 */

/**
 * The page a moved address has now, built from the API's `to` (`/interviews/<company>/<plan>`, `<company>/<plan>` or
 * `<company>`); null for every other state, and for a `to` that is not one of Interviews' pages, so an answer never
 * sends a person off the site.
 */
export function movedPathOf(address: InterviewAddress | null | undefined): Route | null {
  if (address?.state !== 'moved' || typeof address.to !== 'string') return null;
  const parts = address.to.replace(/^\/interviews\//, '').split('/');
  const [company, plan] = parts;
  if (parts.length > 2 || !company || !isInterviewCompanySlug(company)) return null;
  if (parts.length === 1) return interviewCompanyPath(company);
  return isInterviewPlanSlug(plan) ? interviewPlanPath(company, plan) : null;
}
