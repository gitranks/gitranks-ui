import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { InterviewLogoDocument } from './interviews.documents';
import { type InterviewLogoFileSize, interviewCompanyTag, isInterviewCompanySlug } from './paths';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** A base64 PNG as the API sends it: letters, digits, `+`, `/` and up to two `=` at the end. */
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * One logo file of a company, as base64 PNG: null with no logo (none, not checked yet, or taken down), for a slug that
 * is not one, and on a failed read. The same for everyone: kept for hours under the company's tag, so a logo taken
 * down leaves with the company's next expiry; a null only for minutes. Never throws (`home.data.ts` says why).
 */
export async function loadInterviewLogo(company: string, size: InterviewLogoFileSize): Promise<string | null> {
  'use cache';
  cacheTag(interviewCompanyTag(company));
  if (!isInterviewCompanySlug(company)) {
    cacheLife('hours');
    return null;
  }
  let logo: string | null = null;
  try {
    ({ interviewLogo: logo } = await graphqlDirect(InterviewLogoDocument, { company, size }, { source: 'ssr' }));
  } catch {
    logo = null;
  }
  if (typeof logo === 'string' && logo.length > 0 && BASE64.test(logo)) {
    cacheLife('hours');
    return logo;
  }
  cacheLife('minutes');
  return null;
}
