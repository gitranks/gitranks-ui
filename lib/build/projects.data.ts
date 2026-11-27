import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { BUILD_PROJECTS_TAG } from './paths';
import { BuildProjectsDocument, BuildProjectsMineDocument } from './projects.documents';
import type { BuildMine, BuildProjectCard } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * The list of projects in two layers. The public one is the same for everyone and read with no session: cached for
 * hours under the list's tag, which the API expires when the content changes. It never throws: Home and Projects are
 * prerendered when the site is built, and a throw inside a cached read would fail the build, so a failed read (the API
 * down, or not knowing Build yet) is an empty list kept for minutes, and the page draws its empty state. The personal
 * one is read for the signed-in person only, through the route handlers, and never kept.
 */

/** Every live project, in our order. Hours when there are some; minutes for none or a failed read. */
export async function loadBuildProjects(): Promise<BuildProjectCard[]> {
  'use cache';
  cacheTag(BUILD_PROJECTS_TAG);
  let projects: BuildProjectCard[] = [];
  try {
    ({ buildProjects: projects } = await graphqlDirect(BuildProjectsDocument, {}, { source: 'ssr' }));
  } catch {
    projects = [];
  }
  if (Array.isArray(projects) && projects.length) {
    cacheLife('hours');
    return projects;
  }
  cacheLife('minutes');
  return [];
}

/** The signed-in person's builds of every project they touched: null when Build is not open to them, or on failure. */
export async function loadBuildProjectsMine(githubLogin: string): Promise<BuildMine[] | null> {
  try {
    const { buildProjectsMine } = await graphqlDirect(BuildProjectsMineDocument, {}, { source: 'ssr', githubLogin });
    return buildProjectsMine ?? null;
  } catch {
    return null;
  }
}
