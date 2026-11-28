import 'server-only';

import { isBuildProjectSlug } from './paths';
import { BuildStartDocument } from './start.documents';
import type { BuildStart } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * The start flow's state for the signed-in person, for one project or none: null for
 * a project slug no project can have, and on any failure. Never kept: the page reads it again while it waits.
 */
export async function loadBuildStart(githubLogin: string, project: string | null): Promise<BuildStart | null> {
  if (project !== null && !isBuildProjectSlug(project)) return null;
  try {
    const { buildStart } = await graphqlDirect(BuildStartDocument, { project }, { source: 'ssr', githubLogin });
    return buildStart ?? null;
  } catch {
    return null;
  }
}
