import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { BUILD_PROJECTS_TAG, buildProjectTag, buildStepTag } from './paths';
import { loadBuildProject } from './project.data';
import { loadBuildStep } from './step.data';
import { highlightQuestionCodes, highlightStepCodes } from './step-code';
import type { BuildStepCodes } from './step-diff';
import type { BuildProjectPage, BuildStepPage } from './types';
import type { HighlightedCode } from '@/lib/workspace/code-tokens';

/** Everything a step's page draws for everyone: the step, its project, and its code highlighted. */
export type BuildStepViewData = {
  page: BuildStepPage;
  project: BuildProjectPage | null;
  codes: BuildStepCodes;
  questionCodes: HighlightedCode[];
};

/**
 * A step's page, the same for everyone: the live step, its project (the strip's squares, the first step's lists) and
 * its code highlighted once. Null when the step is not live, or its read failed. Kept for hours under the step's tag
 * and its project's; for minutes when the step or its project could not be read. It never throws: a highlighter that
 * fails gives plain code.
 */
export async function loadBuildStepView(project: string, step: string): Promise<BuildStepViewData | null> {
  'use cache';
  cacheTag(buildStepTag(project, step), buildProjectTag(project), BUILD_PROJECTS_TAG);
  const [page, projectPage] = await Promise.all([loadBuildStep(project, step), loadBuildProject(project)]);
  if (!page) {
    cacheLife('minutes');
    return null;
  }
  const [codes, questionCodes] = await Promise.all([
    highlightStepCodes(page).catch((): BuildStepCodes => []),
    highlightQuestionCodes(page).catch((): HighlightedCode[] => []),
  ]);
  if (projectPage) cacheLife('hours');
  else cacheLife('minutes');
  return { page, project: projectPage, codes, questionCodes };
}
