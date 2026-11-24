import type {
  SkillsCourse,
  SkillsFigure,
  SkillsFix,
  SkillsGroup,
  SkillsIssueNumbers,
  SkillsLesson,
  SkillsMine,
  SkillsNumbers,
  SkillsPage,
} from '../skills.types';
import type { LearnDepth } from '@/lib/learn/lesson-page';

/** Skills pages as the API answers them, for the specs and the design catalogue: the boards' people and numbers. */

export const SKILLS_LOGIN = 'octocat';

/** The time every Skills fixture is drawn at. */
export const SKILLS_NOW = new Date('2026-11-24T09:00:00.000Z');

const figure = (key: SkillsFigure['key'], value: number | null, extra: Partial<SkillsFigure> = {}): SkillsFigure => ({
  key,
  value,
  second: null,
  name: null,
  also: null,
  ...extra,
});

/* ------------------------------------------------------------------------------------------------------------------ */
/* Numbers                                                                                                             */
/* ------------------------------------------------------------------------------------------------------------------ */

export const contributorNumbers: SkillsNumbers = {
  kind: 'CONTRIBUTOR',
  figures: [
    figure('FIXES_MERGED', 5, { second: 5 }),
    figure('DAYS_ACTIVE', 41),
    figure('HELPED', 4),
    figure('AGENT', null, { name: 'Claude Code', also: 'Codex' }),
  ],
  blockFigures: [figure('FIXES_MERGED', 5, { second: 5 }), figure('DAYS_ACTIVE', 41), figure('HELPED', 4)],
  since: '2026-06-03T10:00:00.000Z',
  languages: ['Go', 'Python', 'TypeScript'],
  fixes: 6,
  courses: 0,
  made: ['CONTRIBUTE'],
};

/** After the first merged fix: nobody said it helped yet, so the agent takes the third place. */
export const firstFixNumbers: SkillsNumbers = {
  kind: 'CONTRIBUTOR',
  figures: [
    figure('FIXES_MERGED', 1, { second: 1 }),
    figure('DAYS_ACTIVE', 3),
    figure('AGENT', null, { name: 'Claude Code' }),
  ],
  blockFigures: [
    figure('FIXES_MERGED', 1, { second: 1 }),
    figure('DAYS_ACTIVE', 3),
    figure('AGENT', null, { name: 'Claude Code' }),
  ],
  since: '2026-11-18T09:00:00.000Z',
  languages: ['Go'],
  fixes: 1,
  courses: 0,
  made: ['CONTRIBUTE'],
};

/** Pull requests sent, none merged yet. */
export const openOnlyNumbers: SkillsNumbers = {
  kind: 'CONTRIBUTOR',
  figures: [
    figure('PULL_REQUESTS_OPEN', 2, { second: 2 }),
    figure('DAYS_ACTIVE', 4),
    figure('AGENT', null, { name: 'Codex' }),
  ],
  blockFigures: [
    figure('PULL_REQUESTS_OPEN', 2, { second: 2 }),
    figure('DAYS_ACTIVE', 4),
    figure('AGENT', null, { name: 'Codex' }),
  ],
  since: '2026-11-10T09:00:00.000Z',
  languages: ['TypeScript', 'Rust'],
  fixes: 2,
  courses: 0,
  made: ['CONTRIBUTE'],
};

export const learnerNumbers: SkillsNumbers = {
  kind: 'LEARNER',
  figures: [
    figure('LESSONS_LEARNED', 103, { second: 3 }),
    figure('PRACTISED', 31),
    figure('MASTERED', 2),
    figure('DAYS_ACTIVE', 64),
  ],
  blockFigures: [figure('LESSONS_LEARNED', 103, { second: 3 }), figure('MASTERED', 2), figure('DAYS_ACTIVE', 64)],
  since: '2026-06-12T08:00:00.000Z',
  languages: ['Go', 'TypeScript'],
  fixes: 3,
  courses: 3,
  made: ['LEARN'],
};

/** A learner's first day: one lesson, one course, one day. */
export const firstLessonNumbers: SkillsNumbers = {
  kind: 'LEARNER',
  figures: [figure('LESSONS_LEARNED', 1, { second: 1 }), figure('DAYS_ACTIVE', 1)],
  blockFigures: [figure('LESSONS_LEARNED', 1, { second: 1 }), figure('DAYS_ACTIVE', 1)],
  since: '2026-11-24T08:00:00.000Z',
  languages: [],
  fixes: 0,
  courses: 1,
  made: [],
};

export const bothNumbers: SkillsNumbers = {
  kind: 'BOTH',
  figures: [
    figure('FIXES_MERGED', 3, { second: 3 }),
    figure('LESSONS_LEARNED', 103, { second: 3 }),
    figure('MASTERED', 2),
    figure('DAYS_ACTIVE', 78),
  ],
  blockFigures: [
    figure('FIXES_MERGED', 3, { second: 3 }),
    figure('LESSONS_LEARNED', 103, { second: 3 }),
    figure('DAYS_ACTIVE', 78),
  ],
  since: '2026-06-03T10:00:00.000Z',
  languages: ['Go', 'Python', 'TypeScript'],
  fixes: 4,
  courses: 3,
  made: ['LEARN', 'CONTRIBUTE'],
};

/* ------------------------------------------------------------------------------------------------------------------ */
/* Fixes                                                                                                               */
/* ------------------------------------------------------------------------------------------------------------------ */

const fix = (repo: string, issueNumber: number, number: number, extra: Partial<SkillsFix> & Pick<SkillsFix, 'title'>) =>
  ({
    repo,
    issueNumber,
    issueUrl: `https://github.com/${repo}/issues/${issueNumber}`,
    number,
    url: `https://github.com/${repo}/pull/${number}`,
    language: 'Go',
    made: 'CONTRIBUTE',
    state: 'MERGED',
    mergedAt: '2026-11-20T15:00:00.000Z',
    lesson: null,
    page: true,
    ...extra,
  }) satisfies SkillsFix;

const lesson = (slug: string, title: string, courseName = 'Algorithms and data structures') => ({
  slug,
  title,
  course: 'algorithms',
  courseName,
});

export const contributorFixes: SkillsFix[] = [
  fix('harbor-kit/relay', 431, 58, { title: 'The retry list grows without limit when a webhook keeps failing' }),
  fix('spf13/cobra', 2231, 2240, { title: 'A flag set twice kept the first value', mergedAt: '2026-11-09T12:00:00Z' }),
  fix('lumen-data/importer', 97, 102, {
    title: 'Rows with an empty date stopped the import',
    language: 'Python',
    mergedAt: '2026-11-02T12:00:00Z',
  }),
  fix('gin-gonic/gin', 3921, 3930, {
    title: 'A slow client could hold a worker forever',
    mergedAt: '2026-10-27T12:00:00Z',
  }),
  fix('pallets/click', 2710, 2722, {
    title: 'The help text lost its line breaks',
    language: 'Python',
    mergedAt: '2025-12-14T12:00:00Z',
  }),
  fix('honojs/hono', 3188, 3196, {
    title: 'A trailing slash made the router miss the route',
    language: 'TypeScript',
    state: 'OPEN',
    mergedAt: null,
  }),
];

export const learnerFixes: SkillsFix[] = [
  fix('harbor-kit/relay', 431, 58, {
    title: 'The retry list grows without limit when a webhook keeps failing',
    made: 'LEARN',
    lesson: lesson('a-queue-first-in-first-out', 'A queue: first in, first out'),
  }),
  fix('spf13/cobra', 2231, 2240, {
    title: 'A flag set twice kept the first value',
    made: 'LEARN',
    mergedAt: '2026-11-09T12:00:00Z',
    lesson: lesson('split-a-string-on-a-pattern', 'Split a string on a pattern', 'Go'),
  }),
  fix('honojs/hono', 3188, 3196, {
    title: 'A trailing slash made the router miss the route',
    language: 'TypeScript',
    made: 'LEARN',
    state: 'OPEN',
    mergedAt: null,
    lesson: lesson('a-hash-map-stores-values-by-key', 'A hash map stores values by key'),
  }),
];

export const bothFixes: SkillsFix[] = [
  learnerFixes[0],
  learnerFixes[1],
  fix('lumen-data/importer', 97, 102, {
    title: 'Rows with an empty date stopped the import',
    language: 'Python',
    mergedAt: '2026-11-02T12:00:00Z',
  }),
  learnerFixes[2],
];

/** A fix whose public page its sender hid: its GitHub links alone. */
export const hiddenPageFix: SkillsFix = fix('quill-db/quill', 874, 880, {
  title: 'Reading an empty page returned an error instead of no rows',
  page: false,
});

/* ------------------------------------------------------------------------------------------------------------------ */
/* Courses                                                                                                             */
/* ------------------------------------------------------------------------------------------------------------------ */

const DEPTHS: Record<string, [LearnDepth, boolean]> = {
  '.': ['NONE', false],
  L: ['LEARNED', false],
  P: ['PRACTISED', false],
  M: ['MASTERED', false],
  '*': ['MASTERED', true],
};

/** A group from its lessons' depths, one character each: `.` none, `L`, `P`, `M`, and `*` mastered by a merged fix. */
function group(slug: string, name: string, depths: string): SkillsGroup {
  const lessons: SkillsLesson[] = [...depths].map((code, index) => ({
    slug: `${slug}-${index + 1}`,
    title: `${name}, lesson ${index + 1}`,
    level: index < 3 ? 'EASY' : index < 7 ? 'MEDIUM' : 'HARD',
    depth: DEPTHS[code][0],
    fix: DEPTHS[code][1],
  }));
  return { slug, name, learned: lessons.filter((one) => one.depth !== 'NONE').length, lessons };
}

const card = (slug: string, name: string, kind: SkillsCourse['course']['kind'], lessons: number) => ({
  slug,
  name,
  kind,
  covers: '',
  languages: [],
  lessons,
  numbers: { learners: null, goodShare: null },
});

export const algorithmsCourse: SkillsCourse = {
  course: card('algorithms', 'Algorithms and data structures', 'TOPIC', 86),
  learned: 23,
  practised: 6,
  mastered: 1,
  finishedAt: null,
  groups: [
    group('big-o', 'Big-O', 'PPPLLLLL'),
    group('arrays-and-strings', 'Arrays and strings', 'PPLLLLL.....'),
    group('hash-maps-and-sets', 'Hash maps and sets', 'PLLLL....'),
    group('stacks-and-queues', 'Stacks and queues', 'L*L....'),
  ],
  notStarted: ['Linked lists', 'Trees', 'Graphs', 'Sorting and searching', 'Recursion and dynamic programming'],
};

export const goCourse: SkillsCourse = {
  course: card('go', 'Go', 'LANGUAGE', 104),
  learned: 18,
  practised: 5,
  mastered: 1,
  finishedAt: null,
  groups: [
    group('basics', 'Basics', 'PPPLLLLL..'),
    group('slices-and-maps', 'Slices and maps', 'PLLLL.......'),
    group('strings', 'Strings', '*PL......'),
    group('files', 'Files and I/O', 'LL.......'),
  ],
  notStarted: ['Errors', 'Structs and interfaces', 'Goroutines', 'Channels', 'Testing', 'Modules and tooling', 'HTTP'],
};

export const databasesCourse: SkillsCourse = {
  course: card('databases', 'Databases and SQL', 'TOPIC', 62),
  learned: 62,
  practised: 20,
  mastered: 0,
  finishedAt: '2026-11-12T18:00:00.000Z',
  groups: [
    group('queries', 'Queries', 'PPPLLLLLLL'),
    group('joins', 'Joins', 'PPPLLLLLL'),
    group('indexes', 'Indexes', 'PPPLLLLLL'),
    group('transactions', 'Transactions', 'PPPLLLLL'),
    group('schema-design', 'Schema design', 'PPPLLLLLL'),
    group('aggregation', 'Aggregation', 'PPPLLLLL'),
    group('query-plans', 'Query plans', 'PPLLLLLLL'),
  ],
  notStarted: [],
};

/** A learner's first day: one lesson of one group. */
export const firstLessonCourse: SkillsCourse = {
  course: card('algorithms', 'Algorithms and data structures', 'TOPIC', 86),
  learned: 1,
  practised: 0,
  mastered: 0,
  finishedAt: null,
  groups: [group('big-o', 'Big-O', 'L.......')],
  notStarted: [
    'Arrays and strings',
    'Hash maps and sets',
    'Stacks and queues',
    'Linked lists',
    'Trees',
    'Graphs',
    'Sorting and searching',
    'Recursion and dynamic programming',
  ],
};

/** A course about a repository. */
export const repoCourse: SkillsCourse = {
  course: card('nebula-ui', 'nebula/ui', 'REPOSITORY', 38),
  learned: 4,
  practised: 0,
  mastered: 0,
  finishedAt: null,
  groups: [group('rendering', 'Rendering', 'LLLL....')],
  notStarted: ['State', 'Contributing'],
};

/* ------------------------------------------------------------------------------------------------------------------ */
/* Pages and the owner's views                                                                                         */
/* ------------------------------------------------------------------------------------------------------------------ */

const page = (numbers: SkillsNumbers, rows: SkillsFix[], courses: SkillsCourse[]): SkillsPage => ({
  login: SKILLS_LOGIN,
  numbers,
  fixes: { rows, total: rows.length, next: null },
  courses,
  indexable: true,
});

export const contributorPage = page(contributorNumbers, contributorFixes, []);
export const firstFixPage = page(firstFixNumbers, contributorFixes.slice(0, 1), []);
export const learnerPage = page(learnerNumbers, learnerFixes, [algorithmsCourse, goCourse, databasesCourse]);
export const firstLessonPage = page(firstLessonNumbers, [], [firstLessonCourse]);
export const bothPage = page(bothNumbers, bothFixes, [algorithmsCourse, goCourse, databasesCourse]);

/** A long list: six fixes shown of 26, with "Show 20 more". */
export const longPage: SkillsPage = {
  ...contributorPage,
  fixes: { rows: contributorFixes, total: 26, next: 'cursor-6' },
};

/** The night's numbers of the list of issues, as the boards measured them. */
export const skillsIssueNumbers: SkillsIssueNumbers = {
  read: 2_340_000,
  kept: 2_499,
  at: '2026-11-24T03:40:00.000Z',
  rulesLive: true,
  repos: 51_270,
  aiReadsPerDay: 2_800,
};

const mine = (extra: Partial<SkillsMine> & Pick<SkillsMine, 'state'>): SkillsMine => ({
  page: null,
  usesContribute: false,
  usesLearn: false,
  learnOpen: true,
  tabNew: false,
  numbers: null,
  ...extra,
});

export const skillsMine = {
  new: mine({ state: 'NEW', tabNew: true, numbers: skillsIssueNumbers }),
  newLearnClosed: mine({ state: 'NEW', tabNew: true, learnOpen: false, numbers: skillsIssueNumbers }),
  nothingYetBoth: mine({ state: 'NOTHING_YET', usesContribute: true, usesLearn: true }),
  nothingYetContributor: mine({ state: 'NOTHING_YET', usesContribute: true }),
  nothingYetLearner: mine({ state: 'NOTHING_YET', usesLearn: true }),
  publicLearner: mine({ state: 'PUBLIC', page: learnerPage, usesLearn: true }),
  hiddenLearner: mine({ state: 'HIDDEN', page: learnerPage, usesLearn: true }),
  privateLearner: mine({ state: 'PRIVATE', page: firstLessonPage, usesLearn: true }),
  publicFirstFix: mine({ state: 'PUBLIC', page: firstFixPage, usesContribute: true }),
  publicFirstLesson: mine({ state: 'PUBLIC', page: firstLessonPage, usesLearn: true }),
  publicBoth: mine({ state: 'PUBLIC', page: bothPage, usesContribute: true, usesLearn: true }),
} satisfies Record<string, SkillsMine>;
