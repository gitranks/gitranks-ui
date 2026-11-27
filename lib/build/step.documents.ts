import { doc, QUESTION, STEP_REF } from './build.documents';
import type { BuildAddress, BuildStepMine, BuildStepPage } from './types';

/* A step's page: the same for everyone; whether an address is there; and the signed-in person's side of a step. */

const STEP_PAGE = `project { slug name } step { ${STEP_REF} } of part { slug name } say more play sketch
  question { ${QUESTION} }
  languages { language note commit changed { path status diff } files { path text } }
  before { ${STEP_REF} } after { ${STEP_REF} }`;

/** A live step, whole, in both languages: the same for everyone. Null when it is not live. */
export const BuildStepDocument = doc<{ buildStep: BuildStepPage | null }, { project: string; step: string }>(
  `query BuildStep($project: String!, $step: String!) { buildStep(project: $project, step: $step) { ${STEP_PAGE} } }`,
);

/** Whether a project (no `step`) or a step is live, removed or missing. */
export const BuildAddressDocument = doc<
  { buildAddress: BuildAddress | null },
  { project: string; step?: string | null }
>(`query BuildAddress($project: String!, $step: String) { buildAddress(project: $project, step: $step) { state } }`);

/** Where one step stands for each of the person's builds of its project; null when Build is not open to them. */
export const BuildStepMineDocument = doc<{ buildStepMine: BuildStepMine | null }, { project: string; step: string }>(
  `query BuildStepMine($project: String!, $step: String!) {
    buildStepMine(project: $project, step: $step) { builds { language status } }
  }`,
);
