import type { StartMode } from './start-page.types';

/**
 * The one prompt the Start page gives the agent, and the only place its two phrases are written: the issue's address
 * and "with GitRanks", so the agent claims it; "GitRanks Learn and teach me" in lesson mode, so it claims it as a lesson.
 */
export const startPromptOf = (issueUrl: string, mode: StartMode): string =>
  mode === 'lesson' ? `Fix ${issueUrl} with GitRanks Learn and teach me` : `Fix ${issueUrl} with GitRanks`;
