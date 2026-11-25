import 'server-only';

import { learnSignOf } from './learn-sign';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { ContributeSignsDocument } from '@/lib/workspace/contribute.documents';

/**
 * The Learn sign of a signed-in person, read on its own for Learn's routes and pages: true once they saved Learn's
 * onboarding, false before, null when it cannot be read (any failure, or an API that does not answer it). A reader
 * keeps today's rule on null.
 */
export async function loadLearnSign(githubLogin: string): Promise<boolean | null> {
  try {
    const { contribute } = await graphqlDirect(ContributeSignsDocument, undefined, { source: 'ssr', githubLogin });
    return learnSignOf(contribute?.contributor?.learnOnboardedAt);
  } catch {
    return null;
  }
}
