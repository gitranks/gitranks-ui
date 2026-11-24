/** Your progress, as the API answers it: the viewer's Learn numbers and the lists behind them. */

import type { LessonVisibility } from '../learn.types';
import type { ContributeAttemptState } from '@/lib/workspace/contribute.types';

/** The viewer's Learn numbers: one definition, for Your progress and the Learn tab. */
export type LearnProgressCounts = {
  lessonsPassed: number;
  newThings: number;
  reposHelped: number;
  prsMerged: number;
  /** Learn pull requests GitRanks opened, merged and closed ones too. */
  prsOpened: number;
};

/** The viewer's Learn numbers, as the API answers them. */
export type LearnProgress = { counts: LearnProgressCounts };

/**
 * Your progress' Share, from the viewer's Skills page: `public` while everyone can see it, `hidden` while only they can,
 * `not-yet` while nothing is on it. `path`: the Skills page.
 */
export type ProgressShare = { state: 'public' | 'hidden' | 'not-yet'; path: string };

/** The viewer's own lesson (written for their pull request), or another learner's they took as practice. */
export type LearnProgressLessonKind = 'OWN' | 'PRACTICE';
export type LearnProgressLessonsView = 'PASSED' | 'LEARNED';

/** An own lesson's pull request, as Your progress says it: its outcome first, else where the attempt is. */
export type LearnPrLabel = 'MERGED' | 'CLOSED' | 'OPEN' | 'OPENING' | 'READY' | 'REWRITING' | 'ENDED';

/** A step the viewer did not know before the lesson, and passed in it. `parts` as the lesson writes them. */
export type LearnedStep = { stepId: string; number: number; parts: string[]; title: string };

/** A lesson the viewer passed, by their first passed run of it. */
export type LearnProgressLesson = {
  kind: LearnProgressLessonKind;
  /** While the lesson is public. */
  slug: string | null;
  title: string;
  repo: string | null;
  issueNumber: number | null;
  passedAt: string;
  learned: LearnedStep[];
  /** Own lessons only. */
  attemptState: ContributeAttemptState | null;
  prLabel: LearnPrLabel | null;
  prNumber: number | null;
  prUrl: string | null;
  visibility: LessonVisibility;
};

/** A practice lesson started and not passed, or an own Learn attempt that ended with no passed lesson. */
export type LearnProgressUnfinished = {
  kind: LearnProgressLessonKind;
  slug: string | null;
  title: string;
  repo: string | null;
  issueNumber: number | null;
  /** Practice: when the run started. Own: when the attempt ended. */
  at: string;
  /** Practice only. */
  stepsPassed: number | null;
  steps: number | null;
  /** Own only: whether a lesson was written before the attempt ended. */
  hasLesson: boolean | null;
};

export type LearnProgressLessons = {
  items: LearnProgressLesson[];
  total: number;
  /** Lessons passed, page 1 only. */
  notFinished: LearnProgressUnfinished[];
};

export type LearnProgressMergedPr = {
  repo: string;
  issueNumber: number;
  /** The issue's title. */
  title: string | null;
  prNumber: number;
  prUrl: string;
  mergedAt: string;
  /** The lesson is still there. */
  hasLesson: boolean;
};

export type LearnProgressMerged = { items: LearnProgressMergedPr[]; total: number };

export type LearnProgressRepo = {
  repo: string;
  merged: number;
  lastMergedAt: string;
  prs: { prNumber: number; prUrl: string }[];
};

export type LearnProgressRepos = { items: LearnProgressRepo[]; total: number };
