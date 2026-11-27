import 'server-only';

import { InterviewsMineDocument } from './mine.documents';
import type { InterviewsMine } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * My interviews for a signed-in person: their plans in progress and finished. Null when Interviews is not open to
 * them, and on any failure. Never kept: a lesson learned changes it.
 */
export async function loadInterviewsMine(githubLogin: string): Promise<InterviewsMine | null> {
  try {
    const { interviewsMine } = await graphqlDirect(InterviewsMineDocument, undefined, { source: 'ssr', githubLogin });
    return interviewsMine ?? null;
  } catch {
    return null;
  }
}
