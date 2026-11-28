import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { buildProjectTag, buildStepTag, isBuildProjectSlug, isBuildStepSlug } from './paths';
import { BuildAddressDocument, BuildStepDocument, BuildStepMineDocument } from './step.documents';
import type { BuildAddress, BuildStepMine, BuildStepPage } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * A step's page in two layers, as the list (`projects.data.ts`): the public one cached and never throwing, the
 * personal one never kept. And whether an address is there, for a page to answer its 404.
 */

/**
 * A live step, whole, in both languages; null when the slugs are not one, and on a failed read. Kept for hours under
 * the step's tag and its project's (its place and the steps around it); a null only for minutes.
 */
export async function loadBuildStep(project: string, step: string): Promise<BuildStepPage | null> {
  'use cache';
  cacheTag(buildStepTag(project, step), buildProjectTag(project));
  if (!isBuildProjectSlug(project) || !isBuildStepSlug(step)) {
    cacheLife('hours');
    return null;
  }
  let page: BuildStepPage | null = null;
  try {
    ({ buildStep: page } = await graphqlDirect(BuildStepDocument, { project, step }, { source: 'ssr' }));
  } catch {
    page = null;
  }
  if (page) cacheLife('hours');
  else cacheLife('minutes');
  return page ?? null;
}

/**
 * Whether a project (no `step`) or a step is live, removed or missing: `missing` for slugs no project or step can
 * have; null when the read failed, so the page answers as it can. Kept for minutes under the project's tag, and the
 * step's.
 */
export async function loadBuildAddress(project: string, step: string | null = null): Promise<BuildAddress | null> {
  'use cache';
  cacheLife('minutes');
  cacheTag(buildProjectTag(project), ...(step ? [buildStepTag(project, step)] : []));
  if (!isBuildProjectSlug(project) || (step !== null && !isBuildStepSlug(step))) return { state: 'missing' };
  try {
    const { buildAddress } = await graphqlDirect(BuildAddressDocument, { project, step }, { source: 'ssr' });
    return buildAddress ?? null;
  } catch {
    return null;
  }
}

/** Where a step stands for each of the person's builds of its project: null on any failure. */
export async function loadBuildStepMine(
  project: string,
  step: string,
  githubLogin: string,
): Promise<BuildStepMine | null> {
  if (!isBuildProjectSlug(project) || !isBuildStepSlug(step)) return null;
  try {
    const { buildStepMine } = await graphqlDirect(
      BuildStepMineDocument,
      { project, step },
      { source: 'ssr', githubLogin },
    );
    return buildStepMine ?? null;
  } catch {
    return null;
  }
}
