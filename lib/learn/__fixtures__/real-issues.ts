import type { LearnFixes } from '../issues';
import type { HomeFixState, HomeReal, LearnMergedFix, LearnMyFix, LessonRealMine } from '../real-issues';
import { issueRows, learnFixes } from './issues';
import { prLesson, prRow, prRowsLearn } from '@/lib/workspace/__fixtures__/pull-request';
import type { PullRequestListRow } from '@/lib/workspace/pull-request-page.types';

/** Real issues where Learn's pages meet them, as the API answers them, for the specs and the catalogue. */

/** The landing's newest merged fixes: three, of twelve. */
export const landingFixes: LearnFixes = {
  ...learnFixes,
  rows: [
    ...learnFixes.rows,
    {
      repo: 'tessera-ui/tessera',
      issueNumber: 1290,
      number: 1302,
      title: 'Two spellings of one route got two cache entries',
      issueUrl: 'https://github.com/tessera-ui/tessera/issues/1290',
      url: 'https://github.com/tessera-ui/tessera/pull/1302',
      fixer: 'monalisa',
      lesson: null,
      mergedAt: '2026-11-05T11:00:00.000Z',
    },
  ],
};

/** The person's fix that uses the lesson: its pull request open. */
export const myFixOpen: LearnMyFix = {
  repo: 'harbor-kit/relay',
  issueNumber: 431,
  number: 440,
  title: 'The retry list grows without limit when a webhook keeps failing',
  state: 'OPEN',
  lesson: null,
  at: '2026-11-20T10:00:00.000Z',
};

/** The same fix before its pull request opens. */
export const myFixStarted: LearnMyFix = { ...myFixOpen, number: null, state: null };

/** The same fix, merged. */
export const myFixMerged: LearnMyFix = { ...myFixOpen, state: 'MERGED' };

/** A lesson's real side for a person with issues of their list for it and no fix of their own. */
export const lessonRealIssues: LessonRealMine = {
  real: { fix: null, fixAnIssue: issueRows[0] },
  rows: issueRows.slice(0, 3),
  reads: null,
  fixes: learnFixes,
};

/** A lesson's real side for a person with a fix of their own that uses it. */
export const lessonRealWithFix: LessonRealMine = {
  real: { fix: myFixOpen, fixAnIssue: null },
  rows: [],
  reads: null,
  fixes: learnFixes,
};

/** A fix of the person's that needs them: a round's answer is ready. */
export const homeFixNeedsYou = prRow('ROUND_READY', {
  attemptId: 'att_home_ready',
  repo: 'driftwood-js/driftwood',
  issueNumber: 934,
  issueUrl: 'https://github.com/driftwood-js/driftwood/issues/934',
  number: 961,
  url: 'https://github.com/driftwood-js/driftwood/pull/961',
  title: 'Route params lose their type after a redirect',
  round: 2,
  lesson: { ...prLesson, slug: 'a-hash-map', title: 'A hash map stores values by key' },
});

/** Learn home with a fix that needs the person: the box is the fix, the open issues a quiet line under it. */
export const homeRealFix: HomeReal = {
  box: { kind: 'fix', row: homeFixNeedsYou, state: 'needs-you', openIssues: 5 },
  fixes: [homeFixNeedsYou, prRowsLearn[1]],
  issues: issueRows,
};

/** Learn home with no fix that needs the person: the box is the count of open issues that fit them. */
export const homeRealIssues: HomeReal = {
  box: { kind: 'issues', count: 5 },
  fixes: [],
  issues: issueRows,
};

/** The person's fix as each state of the third box follows it: their agent working, its pull request open, merged. */
export const homeFixWorking = prRow('FIXING', { attemptId: 'att_home_fixing', lesson: prLesson });
export const homeFixOpen = prRowsLearn[1];
export const homeFixMerged = prRow('MERGED', {
  attemptId: 'att_home_merged',
  number: 440,
  url: 'https://github.com/harbor-kit/relay/pull/440',
  lesson: { ...prLesson, slug: 'find-duplicates', title: 'Find duplicates in one pass with a set' },
});

/** Learn home following a fix that does not need the person: the box says where it stands, the light stays put. */
export const homeRealFixAt = (row: PullRequestListRow, state: HomeFixState): HomeReal => ({
  box: { kind: 'fix', row, state, openIssues: 5 },
  fixes: row.group === 'ENDED' ? [] : [row],
  issues: issueRows,
});

/** Learn home with no fix and no open issue that fits the person: the quiet box, its email off. */
export const homeRealNone: HomeReal = {
  box: { kind: 'none', emailOn: false, emailTo: 'octocat@example.com' },
  fixes: [],
  issues: [],
};

/** The person's fix merged in the last 7 days, its lesson now Mastered, as the merged fix's read answers it. */
export const homeMergedFix: LearnMergedFix = {
  repo: 'harbor-kit/relay',
  issueNumber: 431,
  number: 440,
  title: 'The retry list grows without limit when a webhook keeps failing',
  state: 'MERGED',
  lesson: { ...prLesson, slug: 'find-duplicates', title: 'Find duplicates in one pass with a set' },
  mastered: true,
  at: '2026-11-20T10:00:00.000Z',
};

/** Learn home with the person's fix merged in the last 7 days: the box says so, and that its lesson is Mastered. */
export const homeRealMerged: HomeReal = {
  box: { kind: 'merged', fix: homeMergedFix },
  fixes: [],
  issues: issueRows,
};
