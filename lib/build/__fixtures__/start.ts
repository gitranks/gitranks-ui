import type { BuildMine, BuildStart } from '../types';
import { buildInProgress, startFresh, startStarted } from './builds';
import { mcpServerStep } from './project';
import { buildProjectsFew, mcpServerCard } from './projects';

/*
 * The start flow's states as its boards draw them: setup, waiting, connected from a project, connected with no
 * project (the list), the build started, and the other cases. The frame's two (`startFresh`, `startStarted`) are the
 * first and the last; these are the ones between and beside.
 */

export { startFresh, startStarted };

/** The agent connected, no build yet: step 2 is open. */
export const startConnected: BuildStart = { agentConnected: true, build: null };

/** The build the started board shows: the first project in TypeScript, on step 1 of 16. */
export const startedBuild: BuildMine = {
  ...buildInProgress,
  state: { kind: 'in_progress', step: mcpServerStep(1), of: 16 },
  stepsDone: [],
};

/** The same project started in Python, read while the page waited. */
export const startStartedPython: BuildStart = {
  agentConnected: true,
  build: { ...startedBuild, build: 'b-mcp-py-new', language: 'python' },
};

/** A build whose base is done when the page reads it: no step to name. */
export const startTestLeft: BuildStart = {
  agentConnected: true,
  build: { ...startedBuild, state: { kind: 'test_left' } },
};

/** The project the address names on the boards. */
export const startProject = mcpServerCard;

/** The list to pick from: the five projects of the boards. */
export const startProjects = buildProjectsFew;
