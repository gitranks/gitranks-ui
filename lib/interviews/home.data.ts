import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { INTERVIEWS_HOME_TAG } from './paths';
import { InterviewsHomeDocument } from './public.documents';
import type { InterviewsHome } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * Interviews' public reads are the same for everyone and read with no session: cached for hours under their tags,
 * which the API expires when the content changes. They never throw: a throw inside a cached read would fail the
 * build, so a failed read (the API down, or not knowing Interviews yet) is an empty answer kept for minutes, and the
 * page draws its empty state.
 */

/** Interviews home with no company: what a failed read gives. */
export const EMPTY_INTERVIEWS_HOME: InterviewsHome = { companies: [], positions: [], top: [] };

/** Interviews home. Hours when it lists a company; minutes for none or a failed read. */
export async function loadInterviewsHome(): Promise<InterviewsHome> {
  'use cache';
  cacheTag(INTERVIEWS_HOME_TAG);
  let home: InterviewsHome | null = null;
  try {
    ({ interviewsHome: home } = await graphqlDirect(InterviewsHomeDocument, {}, { source: 'ssr' }));
  } catch {
    home = null;
  }
  if (home && Array.isArray(home.companies) && home.companies.length) {
    cacheLife('hours');
    return home;
  }
  cacheLife('minutes');
  return EMPTY_INTERVIEWS_HOME;
}
