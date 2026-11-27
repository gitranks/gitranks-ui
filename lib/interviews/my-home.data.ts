import 'server-only';

import { InterviewsMyHomeDocument } from './mine.documents';
import type { InterviewsMyHome } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * The person's plans in progress, the one worked on last first: null when Interviews is not open to them, and on any
 * failure. Never kept.
 */
export async function loadInterviewsMyHome(githubLogin: string): Promise<InterviewsMyHome | null> {
  try {
    const { interviewsMyHome } = await graphqlDirect(InterviewsMyHomeDocument, undefined, {
      source: 'ssr',
      githubLogin,
    });
    return interviewsMyHome ?? null;
  } catch {
    return null;
  }
}
