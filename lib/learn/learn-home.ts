import type { MyLearnAttempt } from './learn.types';

/** "owner/repo#12": an issue named before its title is known. */
export const issueRefOf = (attempt: Pick<MyLearnAttempt, 'repo' | 'issueNumber'>): string =>
  attempt.repo ? `${attempt.repo}#${attempt.issueNumber}` : `Issue #${attempt.issueNumber}`;

/** The attempt's issue title, or `owner/repo#n` until the agent's first brief stores it. */
export const attemptTitleOf = (attempt: Pick<MyLearnAttempt, 'title' | 'repo' | 'issueNumber'>): string =>
  attempt.title?.trim() || issueRefOf(attempt);
