import type { FixMarks, LearnFixPage } from '../fix-page';
import { issueRows } from './issues';

/**
 * The public page of a fix, "Learn from it", for the specs and the design catalogue: the pull request of the timeline
 * fixtures (`lib/workspace/__fixtures__/pr-timeline.ts`) made with Learn, and the person's marks on it.
 */

export const FIX_PR = { nameWithOwner: 'driftwood-js/driftwood', number: 1419 };

/** Merged, made with Learn: a walkthrough of four questions, a lesson, the fixer's answers shared. */
export const learnFix: LearnFixPage = {
  repo: 'driftwood-js/driftwood',
  issueNumber: 871,
  number: 1419,
  state: 'MERGED',
  made: 'LEARN',
  fixer: 'mira-dev',
  questions: 4,
  passes: 12,
  lesson: {
    slug: 'normalize-before-lookup',
    title: 'Normalize a key before you look it up',
    course: 'algorithms',
    courseName: 'Algorithms and data structures',
  },
  answersShared: true,
  title: 'Normalize route paths before the layout cache lookup',
  agent: 'Claude Code',
  mergedAt: '2026-10-26T14:45:00.000Z',
};

/** Most fixes: a walkthrough and no lesson. */
export const learnFixNoLesson: LearnFixPage = { ...learnFix, lesson: null };

/** Open, the project has not merged it yet. */
export const learnFixOpen: LearnFixPage = { ...learnFix, state: 'OPEN', mergedAt: null };

/** Closed without a merge: no "Learn from it". */
export const learnFixClosed: LearnFixPage = { ...learnFix, state: 'CLOSED', mergedAt: null };

/** A walkthrough held while reports are looked at: no walkthrough on the page, and nothing that says so. */
export const learnFixHeld: LearnFixPage = { ...learnFix, questions: null, passes: null };

/** The same pull request made with Contribute. */
export const contributeFix: LearnFixPage = {
  ...learnFix,
  made: 'CONTRIBUTE',
  questions: null,
  passes: null,
  lesson: null,
};

const [first, second] = issueRows;

/** A signed-in learner half-way through the walkthrough, with two similar issues of their list. */
export const marksHalfWay: FixMarks = {
  fixer: false,
  held: false,
  answered: 2,
  passedAt: null,
  lesson: null,
  lessonAt: null,
  similar: [
    { row: first, because: 'SAME_LESSON' },
    { row: second, because: 'SAME_LANGUAGE' },
  ],
};

/** Passed the walkthrough and learned the lesson: the main action moves to the first similar issue. */
export const marksDone: FixMarks = {
  ...marksHalfWay,
  answered: 4,
  passedAt: '2026-12-03T10:00:00.000Z',
  lesson: 'LEARNED',
  lessonAt: '2026-11-28T10:00:00.000Z',
};

/** The fixer on their own fix. */
export const marksFixer: FixMarks = {
  ...marksHalfWay,
  fixer: true,
  answered: 4,
  passedAt: '2026-10-24T11:10:00.000Z',
  similar: [],
};
