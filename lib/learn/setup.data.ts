import 'server-only';

import { isLanguageKey } from './lesson-answer-input';
import { LearnSetupMainLanguageDocument } from './review.documents';
import { type LearnSetupRead, setupReadOf } from './setup';
import { LearnSetupOfMineDocument } from './setup.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * The person's setup, read for them alone and never kept: in the browser through its route, and on the server by
 * Learn's setup page when the Learn sign cannot be read.
 */

/** The person's setup: null when Learn is not open to them, and on any failure. */
export async function loadLearnSetup(githubLogin: string): Promise<LearnSetupRead | null> {
  try {
    const { learnSetupOfMine } = await graphqlDirect(LearnSetupOfMineDocument, {}, { source: 'ssr', githubLogin });
    return setupReadOf(learnSetupOfMine);
  } catch {
    return null;
  }
}

/**
 * The main language of the person's setup, or of our guess of it: every example opens in it first. None when there is
 * none, and on any failure.
 */
export async function loadLearnMainLanguage(githubLogin: string): Promise<string | null> {
  try {
    const { learnSetupOfMine } = await graphqlDirect(
      LearnSetupMainLanguageDocument,
      {},
      { source: 'ssr', githubLogin },
    );
    const main = learnSetupOfMine?.mainLanguage;
    return isLanguageKey(main) ? main : null;
  } catch {
    return null;
  }
}
