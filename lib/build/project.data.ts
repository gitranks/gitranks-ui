import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { BUILD_PROJECTS_TAG, buildProjectTag, isBuildProjectSlug } from './paths';
import { BuildProjectDocument, BuildProjectMineDocument } from './project.documents';
import type { BuildProjectMine, BuildProjectPage } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * A project's page in two layers, as the list (`projects.data.ts`): the public one cached and never throwing, the
 * personal one never kept.
 */

/**
 * A live project, whole; null when the slug is not one, and on a failed read. Kept for hours under the project's tag
 * and the list's (its next projects are cards of the list); a null only for minutes.
 */
export async function loadBuildProject(slug: string): Promise<BuildProjectPage | null> {
  'use cache';
  cacheTag(buildProjectTag(slug), BUILD_PROJECTS_TAG);
  if (!isBuildProjectSlug(slug)) {
    cacheLife('hours');
    return null;
  }
  let project: BuildProjectPage | null = null;
  try {
    ({ buildProject: project } = await graphqlDirect(BuildProjectDocument, { slug }, { source: 'ssr' }));
  } catch {
    project = null;
  }
  if (project) cacheLife('hours');
  else cacheLife('minutes');
  return project ?? null;
}

/** The signed-in person's side of a project: null on any failure. Never kept. */
export async function loadBuildProjectMine(slug: string, githubLogin: string): Promise<BuildProjectMine | null> {
  if (!isBuildProjectSlug(slug)) return null;
  try {
    const { buildProjectMine } = await graphqlDirect(
      BuildProjectMineDocument,
      { slug },
      { source: 'ssr', githubLogin },
    );
    return buildProjectMine ?? null;
  } catch {
    return null;
  }
}
