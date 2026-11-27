import 'server-only';

import { InterviewsBarDocument } from './interviews.documents';
import type { InterviewsBar } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** Interviews' bar for a signed-in person: null when Interviews is not open to them, and on any failure. Never kept. */
export async function loadInterviewsBar(githubLogin: string): Promise<InterviewsBar | null> {
  try {
    const { interviewsBar } = await graphqlDirect(InterviewsBarDocument, undefined, { source: 'ssr', githubLogin });
    return interviewsBar ?? null;
  } catch {
    return null;
  }
}
