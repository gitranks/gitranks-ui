import type {
  LearnedStep,
  LearnProgressCounts,
  LearnProgressLesson,
  LearnProgressLessons,
  LearnProgressMerged,
  LearnProgressRepos,
  LearnProgressUnfinished,
} from '../progress.types';

const step = (stepId: string, number: number, part: string, title: string): LearnedStep => ({
  stepId,
  number,
  parts: [part],
  title,
});

const own = (fields: Partial<LearnProgressLesson> & Pick<LearnProgressLesson, 'title'>): LearnProgressLesson => ({
  kind: 'OWN',
  slug: null,
  repo: 'driftwood-js/driftwood',
  issueNumber: 934,
  passedAt: '2026-11-12T10:00:00.000Z',
  learned: [],
  attemptState: 'PR_OPEN',
  prLabel: 'OPEN',
  prNumber: 961,
  prUrl: 'https://github.com/driftwood-js/driftwood/pull/961',
  visibility: 'PUBLIC',
  ...fields,
});

const practice = (fields: Partial<LearnProgressLesson> & Pick<LearnProgressLesson, 'title'>): LearnProgressLesson => ({
  kind: 'PRACTICE',
  slug: 'retry-backoff-jitter-2m9q',
  repo: 'harbor-io/harbor',
  issueNumber: 140,
  passedAt: '2026-11-03T10:00:00.000Z',
  learned: [],
  attemptState: null,
  prLabel: null,
  prNumber: null,
  prUrl: null,
  visibility: 'PUBLIC',
  ...fields,
});

/** Seven lessons passed, own and practice, with every pull request outcome the board draws. */
export const passedLessons: LearnProgressLesson[] = [
  own({
    slug: 'redirect-param-types-k2p9',
    title: 'Why a redirect dropped the route’s param types',
    learned: [
      step('s2', 2, 'cause', 'The redirect built its target from a plain string'),
      step('s3', 3, 'fix', 'The fix: carry the params type through redirect()'),
      step('s5', 5, 'deep_dive', 'How a generic keeps a literal type'),
    ],
  }),
  own({
    slug: 'sidebar-width-reload-7hq2',
    title: 'Why the sidebar forgot its width after a reload',
    repo: 'tidewave/tide',
    issueNumber: 931,
    passedAt: '2026-11-07T10:00:00.000Z',
    attemptState: 'MERGED',
    prLabel: 'MERGED',
    prNumber: 947,
    prUrl: 'https://github.com/tidewave/tide/pull/947',
    learned: [
      step('s1', 1, 'before', 'The width was read before storage was ready'),
      step('s3', 3, 'fix', 'The fix: read the saved width in one place'),
      step('s4', 4, 'connects', 'Who calls useSidebarWidth'),
    ],
  }),
  practice({
    title: 'Why the retry loop needed jitter',
    learned: [
      step('s2', 2, 'cause', 'Every client retried at the same moment'),
      step('s5', 5, 'deep_dive', 'Why random delays spread the load'),
    ],
  }),
  own({
    slug: 'rate-limiter-retry-twice-3vz8',
    title: 'Why the rate limiter counted a retry twice',
    repo: 'hearth/hearth-api',
    issueNumber: 298,
    passedAt: '2026-10-31T10:00:00.000Z',
    attemptState: 'CLOSED',
    prLabel: 'CLOSED',
    prNumber: 311,
    prUrl: 'https://github.com/hearth/hearth-api/pull/311',
    learned: [
      step('s2', 2, 'cause', 'The retry passed through the middleware again'),
      step('s3', 3, 'fix', 'The fix: count a request once, by its id'),
      step('s4', 4, 'connects', 'Where the limiter sits in the request chain'),
    ],
  }),
  own({
    slug: null,
    title: 'Why nested layouts rebuilt on every navigation',
    issueNumber: 871,
    passedAt: '2026-10-28T10:00:00.000Z',
    attemptState: 'DONE',
    prLabel: 'MERGED',
    prNumber: 1419,
    prUrl: 'https://github.com/driftwood-js/driftwood/pull/1419',
    visibility: 'REMOVED',
    learned: [
      step('s2', 2, 'cause', 'The layout’s key changed with the path'),
      step('s4', 4, 'connects', 'How the router keeps a layout'),
    ],
  }),
  practice({
    slug: 'dialog-focus-after-close-9m1c',
    title: 'Why the dialog kept focus after it closed',
    repo: 'tidewave/tide',
    issueNumber: 880,
    passedAt: '2026-10-25T10:00:00.000Z',
    learned: [],
  }),
  practice({
    slug: null,
    title: 'Why two all-day events overlapped by an hour',
    repo: 'calendarist/cal',
    issueNumber: 61,
    passedAt: '2026-10-20T10:00:00.000Z',
    visibility: 'REMOVED',
    learned: [step('s2', 2, 'cause', 'The end day was read in local time')],
  }),
];

/** A practice lesson started, and an own attempt that ended before its lesson was written. */
export const notFinished: LearnProgressUnfinished[] = [
  {
    kind: 'PRACTICE',
    slug: 'submit-button-disabled-4t7n',
    title: 'Why the submit button stayed disabled',
    repo: 'formwise/formwise',
    issueNumber: 49,
    at: '2026-10-22T10:00:00.000Z',
    stepsPassed: 2,
    steps: 5,
    hasLesson: null,
  },
  {
    kind: 'OWN',
    slug: null,
    title: 'Escape pipes in table cells',
    repo: 'quill-md/quill',
    issueNumber: 188,
    at: '2026-10-12T10:00:00.000Z',
    stepsPassed: null,
    steps: null,
    hasLesson: false,
  },
];

export const progressCounts: LearnProgressCounts = {
  lessonsPassed: 7,
  newThings: 14,
  reposHelped: 2,
  prsMerged: 6,
  prsOpened: 8,
};

/** Nothing passed yet. */
export const zeroCounts: LearnProgressCounts = {
  lessonsPassed: 0,
  newThings: 0,
  reposHelped: 0,
  prsMerged: 0,
  prsOpened: 0,
};

export const lessonsPage: LearnProgressLessons = { items: passedLessons, total: 7, notFinished };

/** New things learned: the lessons that taught one. */
export const learnedPage: LearnProgressLessons = {
  items: passedLessons.filter((lesson) => lesson.learned.length),
  total: 6,
  notFinished: [],
};

const TIDE_PRS = [947, 922, 903, 880, 861];

/** Six merged pull requests: five in one repo, one in another, the newest first. */
export const mergedPage: LearnProgressMerged = {
  items: [
    ...TIDE_PRS.map((prNumber, index) => ({
      repo: 'tidewave/tide',
      issueNumber: prNumber - 16,
      title: index === 0 ? 'Sidebar width resets after a reload' : `Keyboard shortcut ${index} fires twice`,
      prNumber,
      prUrl: `https://github.com/tidewave/tide/pull/${prNumber}`,
      mergedAt: `2026-11-0${9 - index}T10:00:00.000Z`,
      hasLesson: index === 0,
    })),
    {
      repo: 'driftwood-js/driftwood',
      issueNumber: 871,
      title: 'Nested layouts remount on every navigation',
      prNumber: 1419,
      prUrl: 'https://github.com/driftwood-js/driftwood/pull/1419',
      mergedAt: '2026-10-30T10:00:00.000Z',
      hasLesson: false,
    },
  ],
  total: 6,
};

export const reposPage: LearnProgressRepos = {
  items: [
    {
      repo: 'tidewave/tide',
      merged: 5,
      lastMergedAt: '2026-11-09T10:00:00.000Z',
      prs: TIDE_PRS.map((prNumber) => ({
        prNumber,
        prUrl: `https://github.com/tidewave/tide/pull/${prNumber}`,
      })),
    },
    {
      repo: 'driftwood-js/driftwood',
      merged: 1,
      lastMergedAt: '2026-10-30T10:00:00.000Z',
      prs: [{ prNumber: 1419, prUrl: 'https://github.com/driftwood-js/driftwood/pull/1419' }],
    },
  ],
  total: 2,
};
