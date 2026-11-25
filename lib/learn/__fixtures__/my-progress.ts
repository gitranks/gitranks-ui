import type { LearnCourseCard, LearnCourseMineCard } from '../course';
import { addLearnDays, type LearnDay, type LearnHistory, type LearnMyProgress } from '../my-progress';
import { type LearnDayFixes, type MyFixRow, type MyWalkthroughRow, withDayFixes } from '../my-progress-fixes';
import { courseCards } from './course';

/** The day the boards are drawn on: Sunday 22 Nov 2026. */
export const PROGRESS_TODAY = '2026-11-22';

const cardOf = (slug: string) => courseCards.find((course) => course.slug === slug) as LearnCourseCard;
const link = (title: string) => ({
  slug: title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, ''),
  title,
});

const mineCard = (slug: string, patch: Partial<LearnCourseMineCard>): LearnCourseMineCard => ({
  course: cardOf(slug),
  learned: 0,
  practised: 0,
  mastered: 0,
  known: 0,
  due: 0,
  next: null,
  finishedAt: null,
  ...patch,
});

/** My progress's three courses: one under way with the check taken, one language, one finished. */
export const progressCourses: LearnCourseMineCard[] = [
  mineCard('algorithms', {
    learned: 23,
    practised: 6,
    mastered: 1,
    known: 37,
    due: 4,
    next: link('Count things with a hash map'),
  }),
  mineCard('go', { learned: 18, practised: 5, mastered: 1, due: 2, next: link('A slice is a view of an array') }),
  mineCard('databases', { learned: 64, practised: 20, finishedAt: '2026-11-12T16:20:00.000Z' }),
];

/** The newest days, as My progress's History draws them (what the API holds of them). */
const recentDays: LearnDay[] = [
  {
    day: '2026-11-12',
    lessons: 3,
    reviews: 0,
    learned: [link('Read a query plan'), link('When an index is not used'), link('Keep a transaction short')],
    repeated: [],
  },
  {
    day: '2026-11-17',
    lessons: 0,
    reviews: 4,
    learned: [],
    repeated: [link('A stack: last in, first out'), link('Constant time: the work does not grow with the data')],
  },
  {
    day: '2026-11-20',
    lessons: 2,
    reviews: 0,
    learned: [link('Read a file line by line'), link('Close what you open')],
    repeated: [],
  },
  {
    day: '2026-11-21',
    lessons: 1,
    reviews: 9,
    // A lesson learned that day that no page shows any more: counted, not linked.
    learned: [],
    repeated: [link('A queue: first in, first out'), link('Count things with a hash map')],
  },
  {
    day: '2026-11-22',
    lessons: 2,
    reviews: 6,
    learned: [link('A stack: last in, first out'), link('Undo and redo with two stacks')],
    repeated: [
      link('Find duplicates in one pass with a set'),
      link('A hash map stores values by key'),
      link('Check the edge cases of a loop'),
    ],
  },
];

/** Eighty days with something done since 8 Jun, of every shade: a fixed pattern, the newest five from History. */
function calendarDays(): LearnDay[] {
  const days: LearnDay[] = [];
  const recent = new Set(recentDays.map((day) => day.day));
  let day = '2026-06-08';
  for (let index = 0; days.length < 75 && day < '2026-11-12'; index += 1) {
    if (!recent.has(day) && index % 7 !== 3 && index % 5 !== 1) {
      const lessons = [1, 2, 0, 4, 1, 3, 7, 0, 2, 5][index % 10];
      const reviews = [0, 1, 3, 2, 0, 5, 4, 2, 0, 6][index % 9];
      if (lessons + reviews > 0) days.push({ day, lessons, reviews, learned: [], repeated: [] });
    }
    day = addLearnDays(day, 1);
  }
  return [...days, ...recentDays].sort((a, b) => a.day.localeCompare(b.day));
}

/** A learner of some months, as the design catalogue draws them. */
const allDays = calendarDays();

export const myProgress: LearnMyProgress = {
  learned: 105,
  practised: 31,
  mastered: 2,
  known: 37,
  days: allDays,
  activeDays: allDays.length,
  courses: progressCourses,
};

/** A learner who started before the calendar's weeks: every day is counted, the first one is not known. */
export const myProgressLong: LearnMyProgress = { ...myProgress, activeDays: 212 };

/** The first day: one lesson, one course. */
export const myProgressFirstDay: LearnMyProgress = {
  learned: 1,
  practised: 0,
  mastered: 0,
  known: 0,
  days: [
    {
      day: PROGRESS_TODAY,
      lessons: 1,
      reviews: 0,
      learned: [link('Constant time: the work does not grow with the data')],
      repeated: [],
    },
  ],
  activeDays: 1,
  courses: [mineCard('algorithms', { learned: 1, next: link('Constant time: the work does not grow with the data') })],
};

/** The check was taken and nothing answered yet: lessons marked as known only. */
export const myProgressKnownOnly: LearnMyProgress = {
  learned: 0,
  practised: 0,
  mastered: 0,
  known: 37,
  days: [],
  activeDays: 0,
  courses: [mineCard('algorithms', { known: 37, next: link('Count things with a hash map') })],
};

/** Signed in, nothing learned and nothing marked. */
export const myProgressEmpty: LearnMyProgress = {
  learned: 0,
  practised: 0,
  mastered: 0,
  known: 0,
  days: [],
  activeDays: 0,
  courses: [],
};

/** History's first page: the newest days first, with earlier ones waiting. */
export const historyFirst: LearnHistory = { days: [...recentDays].reverse(), more: true };

/** The next page: older days, the last of them. */
export const historyEarlier: LearnHistory = {
  days: [
    {
      day: '2026-11-10',
      lessons: 2,
      reviews: 1,
      learned: [link('Joins, inner and outer')],
      repeated: [link('Read a query plan')],
    },
    { day: '2026-11-09', lessons: 1, reviews: 0, learned: [link('An index is a sorted copy')], repeated: [] },
  ],
  more: false,
};

/* Real fixes ------------------------------------------------------------------------------------------------------- */

const lessonOf = (title: string) => ({ ...link(title), course: 'algorithms', courseName: 'Algorithms' });

/** My progress's "Your fixes": three merged in three projects, one open, one closed. */
export const myFixes: MyFixRow[] = [
  {
    repo: 'driftwood-js/driftwood',
    issueNumber: 934,
    number: 941,
    title: 'Keep route params typed after a redirect',
    state: 'OPEN',
    lesson: lessonOf('A hash map stores values by key'),
    mastered: false,
    readers: null,
    at: '2026-11-21T10:00:00.000Z',
  },
  {
    repo: 'acme/widgets',
    issueNumber: 42,
    number: 57,
    title: 'Stop the cache from growing without a limit',
    state: 'MERGED',
    lesson: lessonOf('A queue: first in, first out'),
    mastered: true,
    readers: 3,
    at: '2026-11-20T15:30:00.000Z',
  },
  {
    repo: 'tinyhttp/core',
    issueNumber: 310,
    number: 318,
    title: 'Close the file when a read fails',
    state: 'MERGED',
    lesson: lessonOf('Close what you open'),
    mastered: false,
    readers: 1,
    at: '2026-11-12T09:00:00.000Z',
  },
  {
    repo: 'mdpress/mdpress',
    issueNumber: 77,
    number: 80,
    title: 'Fix an off-by-one in the line counter',
    state: 'MERGED',
    lesson: null,
    mastered: false,
    readers: null,
    at: '2026-11-03T12:00:00.000Z',
  },
  {
    repo: 'acme/widgets',
    issueNumber: 12,
    number: 19,
    title: 'Sort the list once, not on every render',
    state: 'CLOSED',
    lesson: lessonOf('Count things with a hash map'),
    mastered: false,
    readers: null,
    at: '2026-10-28T08:00:00.000Z',
  },
];

/** My progress's "Walkthroughs": other people's fixes, newest first. */
export const myWalkthroughs: MyWalkthroughRow[] = [
  {
    repo: 'vitejs/vite',
    issueNumber: 18011,
    number: 18020,
    title: 'Read the config file once per build',
    fixer: 'mona-lisa',
    lesson: lessonOf('Read a file line by line'),
    passedAt: '2026-11-21T18:00:00.000Z',
  },
  {
    repo: 'acme/widgets',
    issueNumber: 31,
    number: 36,
    title: 'Use a set to drop repeated tags',
    fixer: 'hubot',
    lesson: lessonOf('Find duplicates in one pass with a set'),
    passedAt: '2026-11-18T11:00:00.000Z',
  },
];

/** What the newest days gain from real fixes: a fix merged on Friday, a walkthrough passed on Saturday. */
export const recentDayFixes = new Map<string, LearnDayFixes>([
  [
    '2026-11-20',
    {
      fixesMerged: [
        {
          repo: 'acme/widgets',
          issueNumber: 42,
          number: 57,
          title: 'Stop the cache from growing without a limit',
          lesson: lessonOf('A queue: first in, first out'),
        },
      ],
      walkthroughs: [],
    },
  ],
  [
    '2026-11-21',
    {
      fixesMerged: [],
      walkthroughs: [
        {
          repo: 'vitejs/vite',
          issueNumber: 18011,
          number: 18020,
          title: 'Read the config file once per build',
          fixer: 'mona-lisa',
          lesson: lessonOf('Read a file line by line'),
          mine: false,
        },
      ],
    },
  ],
]);

/** History's first page with its fixes and walkthroughs. */
export const historyWithFixes: LearnHistory = { days: withDayFixes(historyFirst.days, recentDayFixes), more: true };

/** A learner of some months whose calendar shows the fix merged on Friday. */
export const myProgressWithFixes: LearnMyProgress = { ...myProgress, days: withDayFixes(allDays, recentDayFixes) };
