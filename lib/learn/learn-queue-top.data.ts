import 'server-only';

import { parse } from 'graphql';

import { type LearnQueueTopAnswer, type LearnQueueTopRow, learnQueueTopOf } from './learn-queue-top';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { MASKED_ISSUE_FIELDS } from '@/lib/workspace/masked-issue.fields';
import type DocumentNode from '@/types/typed-document-node';

/**
 * The learner's own list with "For you" on, its rows masked; null when Learn is not open to them. Asked without the
 * Issues page's flag, so the read notes no visit to Issues.
 */
export const LearnQueueTopDocument = parse(`query LearnQueueTop {
  learnQueue(input: { forYou: true, learned: false }) {
    rows { issue { ${MASKED_ISSUE_FIELDS} } full { repo number url title } }
  }
}`) as DocumentNode<{ learnQueue: { rows: LearnQueueTopAnswer[] } | null }, Record<string, never>>;

/** The top of the viewer's own Learn list; null when Learn is not open to them, or on any failure. */
export async function loadLearnQueueTop(githubLogin: string): Promise<LearnQueueTopRow[] | null> {
  try {
    const { learnQueue } = await graphqlDirect(LearnQueueTopDocument, {}, { source: 'client', githubLogin });
    return learnQueue ? learnQueueTopOf(learnQueue.rows) : null;
  } catch {
    return null;
  }
}
