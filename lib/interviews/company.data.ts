import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { interviewCompanyTag, isInterviewCompanySlug } from './paths';
import { InterviewCompanyDocument } from './public.documents';
import type { InterviewCompanyPage } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * A listed company's page; null when the slug is not one, and on a failed read. Kept for hours under the company's
 * tag; a null only for minutes. Never throws (`home.data.ts` says why).
 */
export async function loadInterviewCompany(company: string): Promise<InterviewCompanyPage | null> {
  'use cache';
  cacheTag(interviewCompanyTag(company));
  if (!isInterviewCompanySlug(company)) {
    cacheLife('hours');
    return null;
  }
  let page: InterviewCompanyPage | null = null;
  try {
    ({ interviewCompany: page } = await graphqlDirect(InterviewCompanyDocument, { company }, { source: 'ssr' }));
  } catch {
    page = null;
  }
  if (page) cacheLife('hours');
  else cacheLife('minutes');
  return page ?? null;
}
