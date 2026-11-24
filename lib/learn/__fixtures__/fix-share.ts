import type { LearnFixCard } from '../fix-share-card';

/** Fixes as their public pages read them, for the pictures' specs and the design catalogue: page 21's cases. */

/** A merged fix made with Learn, which used a lesson. */
export const mergedFix: LearnFixCard = {
  repo: 'harbor-kit/relay',
  issueNumber: 431,
  number: 436,
  state: 'MERGED',
  made: 'LEARN',
  fixer: 'octocat',
  lesson: { slug: 'bound-every-retry', title: 'Bound every retry', course: 'reliability', courseName: 'Reliability' },
  title: 'The retry list grows without limit when a webhook keeps failing',
  agent: 'Claude Code',
  mergedAt: '2026-11-20T15:00:00.000Z',
};

/** A pull request still open, waiting for the project's review. */
export const openFix: LearnFixCard = {
  repo: 'gin-gonic/gin',
  issueNumber: 3921,
  number: 3925,
  state: 'OPEN',
  made: 'LEARN',
  fixer: 'octocat',
  lesson: {
    slug: 'set-a-deadline',
    title: 'Set a deadline on every read',
    course: 'reliability',
    courseName: 'Reliability',
  },
  title: 'A slow client could hold a worker forever',
  agent: 'Codex',
  mergedAt: null,
};

/** A fix with no lesson, as most are: the line ends after the date. */
export const noLessonFix: LearnFixCard = {
  repo: 'pallets/click',
  issueNumber: 2710,
  number: 2714,
  state: 'MERGED',
  made: 'CONTRIBUTE',
  fixer: 'octocat',
  lesson: null,
  title: 'The help text lost its line breaks',
  agent: 'Claude Code',
  mergedAt: '2026-10-14T09:30:00.000Z',
};

/** A long title and a long login: the title gets smaller and keeps to three lines. */
export const longFix: LearnFixCard = {
  ...mergedFix,
  repo: 'a-very-long-organisation-name/an-equally-long-repository-name',
  fixer: 'a-very-long-github-login-of-39-chars-xy',
  title:
    'Retrying a webhook that keeps failing grows the retry list without limit, until the process runs out of memory and every delivery of every other webhook stops with it',
};
