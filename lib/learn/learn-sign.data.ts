import 'server-only';

import { learnSignOfAnswer } from './learn-sign';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ContributeSignsDocument } from '@/lib/workspace/contribute.documents';

/**
 * The Learn sign of a signed-in person, read on its own for Learn's routes and pages: true once they saved Learn's
 * onboarding, false before (a new account with no contributor row included), null when it cannot be read (any
 * failure, an answer without the person's Contribute data, or an API that does not answer the stamp). A reader
 * keeps today's rule on null.
 */
export async function loadLearnSign(githubLogin: string): Promise<boolean | null> {
  try {
    const { contribute } = await graphqlDirect(ContributeSignsDocument, undefined, { source: 'ssr', githubLogin });
    return learnSignOfAnswer(contribute);
  } catch {
    return null;
  }
}
