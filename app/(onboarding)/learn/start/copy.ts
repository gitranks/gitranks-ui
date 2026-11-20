/**
 * The words of Learn's flow pages, kept here so the pages and the design catalogue draw the same ones (a page file may
 * export only what the framework reads).
 */

/** Your goal, for a visitor: under the goal's card. */
export const GOAL_VISITOR_NOTE = 'Nothing is saved yet. You sign in when you start an issue.';

/** Pick an issue, for a visitor: over the day's list. */
export const STARTING_ASKS = 'Starting asks you to sign in with GitHub.';

/** Pick an issue's practice section. */
export const PRACTICE_TITLE = 'Practice first?';
export const PRACTICE_TEXT =
  'See how a lesson works on a finished fix before your own. Each was written for another learner with the same goal, and needs no agent.';

/** Your agent's way back to Pick an issue. */
export const BACK_LABEL = 'Issues for your goal';

/** Your agent's section 1, open or done. */
export const SIGN_IN_SECTION_TITLE = '1 · Sign in with GitHub';

/** Section 1's line for a visitor; the goal named when the address carries one ("TypeScript, Some"). */
export const signInSectionTextOf = (goal: string | null): string =>
  `The lesson and the pull request will be in your name.${goal ? ` Your goal comes with you: ${goal}.` : ''}`;

/** The issue card's goal line: what the lesson will be written for ("TypeScript, Some"). */
export const writtenForOf = (goal: string): string => `Your lesson will be written for: ${goal}`;
