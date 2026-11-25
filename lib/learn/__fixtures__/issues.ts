import { ISSUES_VIEW, type IssuesList, type IssuesRow, type IssuesView, type LearnFixes } from '../issues';
import { fullIssue, maskedIssue, maskedIssues } from '@/lib/workspace/__fixtures__/masked-issue';

/** Issues' rows, counts and ends, as the API answers them, for the specs and the catalogue. */

const lesson = (slug: string, title: string) => ({
  slug,
  title,
  course: 'algorithms',
  courseName: 'Algorithms and data structures',
});

/** Five rows: two lessons learned, two new, one with no lesson. */
export const issueRows: IssuesRow[] = [
  {
    issue: maskedIssues[0],
    full: null,
    lesson: lesson('find-duplicates-with-a-set', 'Find duplicates in one pass with a set'),
    why: 'USES_LEARNED',
    learnOnly: false,
  },
  {
    issue: maskedIssues[1],
    full: null,
    lesson: lesson('a-hash-map-stores-values-by-key', 'A hash map stores values by key'),
    why: 'USES_LEARNED',
    learnOnly: false,
  },
  {
    issue: maskedIssues[2],
    full: null,
    lesson: lesson('a-stack-last-in-first-out', 'A stack: last in, first out'),
    why: 'TEACHES_NEW',
    learnOnly: true,
  },
  {
    issue: maskedIssue({
      id: 'u2x6b8kq',
      title: 'A search in a sorted index reads every entry',
      language: 'Go',
      size: 'M',
      kind: 'performance',
      projectTier: 6,
      hints: [{ kind: 'MERGES_OUTSIDE', count: null }],
    }),
    full: null,
    lesson: lesson('binary-search', 'Binary search: throw away half the list each time'),
    why: 'TEACHES_NEW',
    learnOnly: false,
  },
  {
    issue: maskedIssue({
      id: 'v9d3f1mz',
      title: 'A date typed as text stays on screen after the date is changed',
      language: 'Python',
      kind: 'bug',
      projectTier: 2,
      hints: [{ kind: 'AGREED', count: null }],
    }),
    full: null,
    lesson: null,
    why: 'NO_LESSON',
    learnOnly: false,
  },
];

/** A visitor's five: every row with a lesson says it is new. */
export const visitorRows: IssuesRow[] = issueRows.map((row) =>
  row.why === 'USES_LEARNED' ? { ...row, why: 'TEACHES_NEW' } : row,
);

/** A row whose project the person named: the issue in full over its facts. */
export const namedRow: IssuesRow = {
  ...issueRows[0],
  issue: maskedIssue({ project: 'acme/notebook' }),
  full: fullIssue(),
};

/** The person's five, "For you" on, with both counts. */
export const personalList = (patch: Partial<IssuesList> = {}): IssuesList => ({
  rows: issueRows,
  forYouCount: 212,
  learnedCount: 14,
  emptyEnd: null,
  outsideForYou: null,
  emailOn: false,
  emailTo: 'y***@example.com',
  lessonIssues: false,
  lessonIssuesCovered: null,
  ...patch,
});

/** No row: issues wait outside "For you". */
export const listOutsideForYou = (patch: Partial<IssuesList> = {}): IssuesList =>
  personalList({
    rows: [],
    forYouCount: 26,
    learnedCount: null,
    emptyEnd: 'OUTSIDE_FOR_YOU',
    outsideForYou: 26,
    ...patch,
  });

/** No row and nothing outside "For you" either. */
export const listNone = (patch: Partial<IssuesList> = {}): IssuesList =>
  personalList({ rows: [], forYouCount: null, learnedCount: null, emptyEnd: 'NONE', outsideForYou: null, ...patch });

/** Views as the address sets them. */
export const views = {
  plain: ISSUES_VIEW,
  lesson: { ...ISSUES_VIEW, lesson: 'find-duplicates-with-a-set', show: 'both' },
  course: { ...ISSUES_VIEW, course: 'algorithms', learned: true },
  courseFixed: { ...ISSUES_VIEW, course: 'algorithms', show: 'fixed' },
  language: { ...ISSUES_VIEW, language: 'go' },
  learned: { ...ISSUES_VIEW, learned: true },
  repo: { ...ISSUES_VIEW, repo: 'django/django' },
  orgFixed: { ...ISSUES_VIEW, org: 'kubernetes', show: 'fixed' },
} satisfies Record<string, IssuesView>;

export const issuesNames = {
  lesson: 'Find duplicates in one pass with a set',
  course: 'Algorithms and data structures',
};

/** Three merged fixes, and more to read. */
export const learnFixes: LearnFixes = {
  rows: [
    {
      repo: 'harbor-kit/relay',
      issueNumber: 412,
      number: 418,
      title: 'Webhook deliveries were processed twice',
      issueUrl: 'https://github.com/harbor-kit/relay/issues/412',
      url: 'https://github.com/harbor-kit/relay/pull/418',
      fixer: 'octocat',
      lesson: lesson('find-duplicates-with-a-set', 'Find duplicates in one pass with a set'),
      mergedAt: '2026-11-18T09:30:00.000Z',
      language: 'go',
    },
    {
      repo: 'lumen-data/importer',
      issueNumber: 88,
      number: 93,
      title: 'The importer counted one email as two users',
      issueUrl: 'https://github.com/lumen-data/importer/issues/88',
      url: 'https://github.com/lumen-data/importer/pull/93',
      fixer: 'hubot',
      lesson: null,
      mergedAt: '2026-11-12T16:00:00.000Z',
      language: 'python',
    },
  ],
  total: 12,
  next: 'cursor-2',
};
