import 'server-only';

import { type BuildActionResult, buildErrorOf, invalidBuildAction } from './build-action';
import { isBuildId } from './build-ids';
import { BuildMineDocument, RemoveBuildDocument } from './mine.documents';
import type { BuildMineList } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** My builds for the signed-in person: null on any failure. Never kept. */
export async function loadBuildMine(githubLogin: string): Promise<BuildMineList | null> {
  try {
    const { buildMine } = await graphqlDirect(BuildMineDocument, {}, { source: 'ssr', githubLogin });
    return buildMine ?? null;
  } catch {
    return null;
  }
}

/** Removes one of the person's builds in progress, as the session's person and never one named in the arguments. */
export async function removeBuild(githubLogin: string, build: unknown): Promise<BuildActionResult<boolean | null>> {
  if (!isBuildId(build)) return invalidBuildAction();
  try {
    const { removeBuild: removed } = await graphqlDirect(
      RemoveBuildDocument,
      { build },
      { source: 'client', githubLogin },
    );
    return { ok: true, data: removed ?? null };
  } catch (error) {
    return { ok: false, error: buildErrorOf(error) };
  }
}
