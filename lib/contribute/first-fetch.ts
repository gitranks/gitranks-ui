import 'server-only';

import { ContributeFirstFetchDocument } from './contribute.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * Asked on every sign-in: GitRanks reads a new account at once (when it has nothing of it yet), so Contribute opens
 * for it minutes later. Never fails the sign-in.
 */
export async function askFirstFetch(githubLogin: string | undefined, accountEmail?: string | null): Promise<void> {
  if (!githubLogin) return;
  try {
    await graphqlDirect(ContributeFirstFetchDocument, undefined, {
      source: 'ssr',
      githubLogin,
      ...(accountEmail ? { accountEmail } : {}),
    });
  } catch (error) {
    console.warn(`first read of ${githubLogin} not asked: ${(error as Error).message}`);
  }
}
