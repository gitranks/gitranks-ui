import 'server-only';

import { parse } from 'graphql';

import type { LearnBarRead } from './learn-bar';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type DocumentNode from '@/types/typed-document-node';

const LearnBarDocument = parse(
  'query LearnBar { learnBar { setup due pullRequests pullRequestsNeedYou } }',
) as DocumentNode<{ learnBar: LearnBarRead | null }>;

/** Learn's bar for a signed-in person: null when Learn is not open to them, and on any failure. */
export async function loadLearnBar(githubLogin: string): Promise<LearnBarRead | null> {
  try {
    const { learnBar } = await graphqlDirect(LearnBarDocument, undefined, { source: 'ssr', githubLogin });
    return learnBar ?? null;
  } catch {
    return null;
  }
}
