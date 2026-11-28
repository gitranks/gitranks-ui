import 'server-only';

import { BuildHomeDocument } from './home.documents';
import type { BuildHome } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** Build's home for the signed-in person: null on any failure. Never kept. */
export async function loadBuildHome(githubLogin: string): Promise<BuildHome | null> {
  try {
    const { buildHome } = await graphqlDirect(BuildHomeDocument, {}, { source: 'ssr', githubLogin });
    return buildHome ?? null;
  } catch {
    return null;
  }
}
