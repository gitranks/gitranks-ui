import { BUILD_MINE, doc } from './build.documents';
import type { BuildStart } from './types';

/* The start flow's state, read again while the page waits for the agent and for the build. */

/** Whether an agent connected, and the person's build of the project once started; null signed out. */
export const BuildStartDocument = doc<{ buildStart: BuildStart | null }, { project?: string | null }>(
  `query BuildStart($project: String) { buildStart(project: $project) { agentConnected build { ${BUILD_MINE} } } }`,
);
