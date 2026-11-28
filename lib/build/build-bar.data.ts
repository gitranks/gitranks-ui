import 'server-only';

import { BuildBarDocument } from './build.documents';
import type { BuildBar } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** Build's bar for a signed-in person: null on any failure. Never kept. */
export async function loadBuildBar(githubLogin: string): Promise<BuildBar | null> {
  try {
    const { buildBar } = await graphqlDirect(BuildBarDocument, undefined, { source: 'ssr', githubLogin });
    return buildBar ?? null;
  } catch {
    return null;
  }
}
