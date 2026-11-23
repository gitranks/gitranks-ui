import type {
  LearnCourse,
  LearnCourseCard,
  LearnCourseLessonMine,
  LearnCourseMine,
  LearnCourseMineCard,
  LearnLessonListItem,
} from '../course';
import type { LearnCourseGroup, LearnDepth, LearnLessonLevel } from '../lesson-page';

/*
 * The courses of pages 2 and 24's boards: the algorithms course with its 86 lessons in 9 groups, the list of every
 * course, and a learner's side in each state the boards draw.
 */

const E: LearnLessonLevel = 'EASY';
const M: LearnLessonLevel = 'MEDIUM';
const H: LearnLessonLevel = 'HARD';

/** The lessons of each group, as the boards list them. */
const GROUPS: [string, [string, LearnLessonLevel][]][] = [
  [
    'Big-O',
    [
      ['What “the work grows with the data” means', E],
      ['Constant time: the work does not grow with the data', E],
      ['Linear time: one step per item', E],
      ['A loop inside a loop makes the work grow fast', M],
      ['Halving each time: logarithmic time', M],
      ['Why Big-O ignores constants', M],
      ['Time or memory: you often trade one for the other', H],
      ['Best case, worst case, average case', H],
    ],
  ],
  [
    'Arrays and strings',
    [
      ['An array keeps its items side by side', E],
      ['Reading by position is instant', E],
      ['Inserting in the middle moves everything after it', E],
      ['Why adding to the end of a list is usually fast', E],
      ['Two pointers: walk in from both ends', M],
      ['A sliding window over a list', M],
      ['Reverse a list in place', M],
      ['Prefix sums: answer range questions fast', M],
      ['A string is an array of characters', H],
      ['Why building a string in a loop can be slow', H],
      ['Compare two strings character by character', H],
      ['Check if a string reads the same both ways', H],
    ],
  ],
  [
    'Hash maps and sets',
    [
      ['A hash map stores values by key', E],
      ['How a hash map finds a key', E],
      ['Find duplicates in one pass with a set', E],
      ['Count things with a hash map', M],
      ['What happens when two keys collide', M],
      ['Group items by a key', M],
      ['Find two numbers that add up to a target', H],
      ['When a hash map is the wrong choice', H],
      ['Sets: union, intersection, difference', H],
    ],
  ],
  [
    'Stacks and queues',
    [
      ['A stack: last in, first out', E],
      ['A queue: first in, first out', E],
      ['Check matching brackets with a stack', E],
      ['Undo and redo with two stacks', M],
      ['Build a queue from two stacks', M],
      ['The call stack is a stack', H],
      ['A deque: add and remove at both ends', H],
    ],
  ],
  [
    'Linked lists',
    [
      ['A linked list: each item points to the next', E],
      ['Insert without moving anything', E],
      ['Why reading item 500 is slow', E],
      ['Reverse a linked list', M],
      ['Find the middle with a slow and a fast pointer', M],
      ['Detect a loop in a linked list', H],
      ['Array or linked list: how to choose', H],
    ],
  ],
  [
    'Trees',
    [
      ['A tree: a parent and its children', E],
      ['Binary search tree: smaller left, bigger right', E],
      ['Walk a tree depth first', E],
      ['Walk a tree level by level', E],
      ['The height of a tree', M],
      ['Why a balanced tree is fast', M],
      ['An in-order walk gives sorted order', M],
      ['A heap keeps the smallest on top', M],
      ['A priority queue is a heap', H],
      ['A trie stores words by their letters', H],
      ['Find the lowest common ancestor', H],
      ['Recursion on trees: solve a node, then its children', H],
    ],
  ],
  [
    'Graphs',
    [
      ['A graph: things and the links between them', E],
      ['Two ways to store a graph', E],
      ['Breadth-first search: nearest first', E],
      ['Depth-first search: go deep, then back up', E],
      ['Shortest path when every step costs the same', M],
      ['Detect a cycle', M],
      ['Topological order: what must come first', M],
      ['Count connected groups', M],
      ['Dijkstra: shortest path with weights', H],
      ['A grid is a graph', H],
      ['Union-find: are these two connected?', H],
    ],
  ],
  [
    'Sorting and searching',
    [
      ['Binary search: throw away half the list each time', E],
      ['Sort before you search', E],
      ['Why sorting takes n log n', E],
      ['Merge sort: split, sort, merge', E],
      ['Quicksort: pick a pivot and partition', M],
      ['Stable sort: equal items keep their order', M],
      ['Sort by a key', M],
      ['Find the k-th largest without sorting everything', H],
      ['Binary search on the answer', H],
      ['Counting sort: when the values are small numbers', H],
    ],
  ],
  [
    'Recursion and dynamic programming',
    [
      ['Recursion: a function that calls itself', E],
      ['Every recursion needs a stopping case', E],
      ['Why naive Fibonacci is slow', E],
      ['Memoisation: remember what you already worked out', E],
      ['Dynamic programming: build answers from smaller ones', M],
      ['Climbing stairs: the simplest case', M],
      ['The knapsack problem', M],
      ['Longest common subsequence', H],
      ['Backtracking: try, undo, try again', H],
      ['Generate all subsets', H],
    ],
  ],
];

/** The slugs the lesson's own fixtures use, so a course and its lessons agree. */
const KNOWN_SLUGS: Record<string, string> = {
  'How a hash map finds a key': 'how-a-hash-map-finds-a-key',
  'Find duplicates in one pass with a set': 'find-duplicates-with-a-set',
  'Count things with a hash map': 'count-things-with-a-hash-map',
};

const slugOf = (text: string) =>
  KNOWN_SLUGS[text] ??
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const groups: LearnCourseGroup[] = GROUPS.map(([name, lessons]) => ({
  slug: slugOf(name),
  name,
  lessons: lessons.map(([title, level]) => ({ slug: slugOf(title), title, level, paused: false })),
}));

/** A lesson by its place on the boards: group and lesson, both from 1 ("3-4" is the fourth of the third group). */
export const lessonAt = (at: string) => {
  const [group, index] = at.split('-').map(Number);
  const lesson = groups[group - 1]?.lessons[index - 1];
  if (!lesson) throw new Error(`No lesson ${at}`);
  return lesson;
};

const SEVEN = ['python', 'javascript', 'go', 'rust', 'java', 'php', 'ruby'];

const card = (
  slug: string,
  name: string,
  kind: LearnCourseCard['kind'],
  covers: string,
  lessons: number,
  learners: number | null,
  goodShare: number | null,
): LearnCourseCard => ({
  slug,
  name,
  kind,
  covers,
  languages: kind === 'TOPIC' ? SEVEN : [slug],
  lessons,
  numbers: { learners, goodShare },
});

/** Every course, in the list's order: four topics, then the seven languages. */
export const courseCards: LearnCourseCard[] = [
  card(
    'algorithms',
    'Algorithms and data structures',
    'TOPIC',
    'How to store data and work through it fast',
    86,
    1240,
    94,
  ),
  card('databases', 'Databases and SQL', 'TOPIC', 'Tables, joins, indexes and transactions', 64, 860, 92),
  card('design-patterns', 'Design patterns', 'TOPIC', 'Common shapes for code that has to change', 58, 412, 90),
  card('system-design', 'System design', 'TOPIC', 'How large systems are put together', 47, null, null),
  card('python', 'Python', 'LANGUAGE', 'From the first variable to generators', 102, 530, 93),
  card('javascript', 'JavaScript', 'LANGUAGE', 'The language of the browser and Node.js', 98, 447, null),
  card('go', 'Go', 'LANGUAGE', 'From the first variable to goroutines', 104, 318, 91),
  card('rust', 'Rust', 'LANGUAGE', 'Ownership, borrowing and what follows', 105, 74, 95),
  card('java', 'Java', 'LANGUAGE', 'Classes, generics and the virtual machine', 101, 96, null),
  card('php', 'PHP', 'LANGUAGE', 'From a first script to a modern application', 97, null, null),
  card('ruby', 'Ruby', 'LANGUAGE', 'Objects, blocks and writing code that reads well', 99, null, null),
];

const cardOf = (slug: string) => courseCards.find((course) => course.slug === slug) as LearnCourseCard;

/** The algorithms course, whole, as everyone reads it. */
export const algorithmsCourse: LearnCourse = {
  ...cardOf('algorithms'),
  about:
    'How to store data and work through it fast. The ideas behind most coding interviews, one small lesson at a time.',
  groups,
  next: cardOf('databases'),
  checkOffered: true,
  changedAt: '2026-11-20T09:00:00.000Z',
};

/** The same course with "Find duplicates in one pass with a set" paused (page 33). */
export const algorithmsCoursePaused: LearnCourse = {
  ...algorithmsCourse,
  groups: algorithmsCourse.groups.map((group) => ({
    ...group,
    lessons: group.lessons.map((lesson) =>
      lesson.slug === 'find-duplicates-with-a-set' ? { ...lesson, paused: true } : lesson,
    ),
  })),
};

/** The courses the course page's foot names besides this one. */
export const otherCourses: LearnCourseCard[] = ['databases', 'design-patterns', 'system-design'].map(cardOf);

/** A language course, for the line under its title. */
export const goCourse: LearnCourse = {
  ...cardOf('go'),
  about: 'The language itself, from the first variable to goroutines and channels. One small lesson at a time.',
  groups: [
    {
      slug: 'basics',
      name: 'Basics',
      lessons: [{ slug: 'go-variables', title: 'Declare a variable with :=', level: E, paused: false }],
    },
  ],
  next: null,
  checkOffered: true,
  changedAt: '2026-11-20T09:00:00.000Z',
};

/* ------------------------------------------------------------------------------------------------------------------ */
/* A learner's side of the algorithms course                                                                          */
/* ------------------------------------------------------------------------------------------------------------------ */

type Own = { depth?: LearnDepth; known?: boolean; due?: boolean };

/** A learner's side from the lessons the boards mark, by place; the counts follow from them. */
function mineOf(
  marks: Record<string, Own>,
  rest: Partial<Pick<LearnCourseMine, 'next' | 'check' | 'finishedAt' | 'feedbackGood'>> & { nextAt?: string } = {},
): LearnCourseMine {
  const lessons: LearnCourseLessonMine[] = Object.entries(marks).map(([at, own]) => ({
    slug: lessonAt(at).slug,
    depth: own.depth ?? 'NONE',
    known: !!own.known && (own.depth ?? 'NONE') === 'NONE',
    due: !!own.due,
  }));
  const at = (depths: LearnDepth[]) => lessons.filter((lesson) => depths.includes(lesson.depth)).length;
  const next = rest.nextAt ? lessonAt(rest.nextAt) : null;
  return {
    slug: 'algorithms',
    learned: at(['LEARNED', 'PRACTISED', 'MASTERED']),
    practised: at(['PRACTISED', 'MASTERED']),
    mastered: at(['MASTERED']),
    known: lessons.filter((lesson) => lesson.known).length,
    due: lessons.filter((lesson) => lesson.due).length,
    lessons,
    next: next ? { slug: next.slug, title: next.title } : (rest.next ?? null),
    check: rest.check ?? { state: 'NONE', left: 0 },
    finishedAt: rest.finishedAt ?? null,
    feedbackGood: rest.feedbackGood ?? null,
  };
}

const L: Own = { depth: 'LEARNED' };
const P: Own = { depth: 'PRACTISED' };
const MA: Own = { depth: 'MASTERED' };
const DUE = (own: Own): Own => ({ ...own, due: true });
const K: Own = { known: true };

/** Signed in, nothing learned yet. */
export const freshMine = mineOf({}, { nextAt: '1-1' });

/** In progress: ten learned, four due, the fourth lesson of "Hash maps and sets" next. */
export const progressMine = mineOf(
  {
    '1-1': MA,
    '1-2': P,
    '1-3': DUE(L),
    '1-4': DUE(L),
    '2-1': P,
    '2-2': P,
    '2-3': DUE(L),
    '3-1': L,
    '3-2': DUE(L),
    '3-3': L,
  },
  { nextAt: '3-4' },
);

/** "Hash maps and sets" just finished: the first lesson of the next group is next. */
export const groupDoneMine = mineOf(
  {
    '1-1': MA,
    '1-2': P,
    '1-3': DUE(L),
    '1-4': DUE(L),
    '2-1': P,
    '2-2': P,
    '2-3': DUE(L),
    '3-1': P,
    '3-2': P,
    ...Object.fromEntries(['3-3', '3-4', '3-5', '3-6', '3-7', '3-8', '3-9'].map((at) => [at, L])),
  },
  { nextAt: '4-1' },
);

const DONE_MASTERED = '1-1 1-6 2-5 2-10 3-4 3-9 4-3 5-2 5-7 6-1 6-6 6-11 7-5 7-10 8-4 8-9 9-3 9-8'.split(' ');
const DONE_PRACTISED =
  '1-2 1-4 1-8 2-1 2-3 2-7 2-9 2-11 3-2 3-6 3-8 4-1 4-5 4-7 5-4 5-6 6-3 6-5 6-7 6-9 7-2 7-4 7-6 7-8 8-1 8-3 8-5 8-7 9-2 9-4 9-6 9-10'.split(
    ' ',
  );
const DONE_DUE = new Set(['1-5', '2-2', '7-10', '8-7', '9-4']);

const DONE_MARKS: Record<string, Own> = Object.fromEntries(
  groups.flatMap((group, g) =>
    group.lessons.map((_, i) => {
      const at = `${g + 1}-${i + 1}`;
      const own = DONE_MASTERED.includes(at) ? MA : DONE_PRACTISED.includes(at) ? P : L;
      return [at, DONE_DUE.has(at) ? DUE(own) : own];
    }),
  ),
);

/** Every lesson learned: the course is finished, and rated good. */
export const doneMine = mineOf(DONE_MARKS, { finishedAt: '2026-11-18T10:00:00.000Z', feedbackGood: true });

/**
 * Finished with one lesson never answered, now paused ("Find duplicates in one pass with a set", on
 * `algorithmsCoursePaused`): every lesson that is not paused is learned.
 */
export const donePausedMine = mineOf(Object.fromEntries(Object.entries(DONE_MARKS).filter(([at]) => at !== '3-3')), {
  finishedAt: '2026-11-18T10:00:00.000Z',
});

/** The check marked every lesson but the first as known, and the first is learned: no next lesson, not finished. */
export const allKnownMine = mineOf(
  Object.fromEntries(
    groups.flatMap((group, g) => group.lessons.map((_, i) => [`${g + 1}-${i + 1}`, g === 0 && i === 0 ? L : K])),
  ),
  { check: { state: 'SAVED', left: 0 } },
);

/** A check left in the middle: four questions to go. */
export const checkUnfinishedMine = mineOf({}, { nextAt: '1-1', check: { state: 'UNFINISHED', left: 4 } });

const SAVED_KNOWN = [
  ...['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8'],
  ...Array.from({ length: 12 }, (_, i) => `2-${i + 1}`),
  ...['3-1', '3-2', '3-3', '3-4', '3-6', '3-7', '3-9'],
  ...Array.from({ length: 10 }, (_, i) => `8-${i + 1}`),
];

/** The check saved: 37 lessons marked as known, the first lesson not marked is next. */
export const checkSavedMine = mineOf(Object.fromEntries(SAVED_KNOWN.map((at) => [at, K])), {
  nextAt: '3-5',
  check: { state: 'SAVED', left: 0 },
});

/** Later: two lessons learned since the check, 36 still marked as known. */
export const knownLaterMine = mineOf(
  { ...Object.fromEntries(SAVED_KNOWN.map((at) => [at, K])), '1-1': L, '3-5': L },
  { nextAt: '3-8', check: { state: 'SAVED', left: 0 } },
);

/* ------------------------------------------------------------------------------------------------------------------ */
/* All courses                                                                                                        */
/* ------------------------------------------------------------------------------------------------------------------ */

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

/** A learner with two courses started. */
export const coursesMine: LearnCourseMineCard[] = [
  mineCard('algorithms', { learned: 10, practised: 4, mastered: 1, due: 4 }),
  mineCard('go', { learned: 3, practised: 1 }),
];

/** A learner who learned every lesson of the algorithms course. */
export const coursesMineAllLearned = mineCard('algorithms', {
  learned: 86,
  practised: 50,
  mastered: 18,
  finishedAt: '2026-11-18T10:00:00.000Z',
});

/** A learner who took Go's check: twelve learned, forty marked as known. */
export const coursesMineChecked = mineCard('go', { learned: 12, practised: 4, known: 40 });

const item = (course: string, group: string, title: string, level: LearnLessonLevel = E): LearnLessonListItem => ({
  slug: slugOf(title),
  title,
  level,
  course: { slug: course, title: cardOf(course).name },
  group: { slug: slugOf(group), title: group },
  paused: false,
  changedAt: '2026-11-20T09:00:00.000Z',
});

/** Every lesson, for the search: the algorithms course's, and some of the other courses'. */
export const lessonList: LearnLessonListItem[] = [
  ...groups.flatMap((group) =>
    group.lessons.map((lesson) => item('algorithms', group.name, lesson.title, lesson.level)),
  ),
  item('databases', 'Indexes', 'A hash index answers “equal to” and nothing else'),
  item('databases', 'Queries', 'ORDER BY sorts the rows last'),
  item('system-design', 'Sharding', 'Consistent hashing spreads keys over servers', M),
  item('python', 'Lists', 'sorted() and the key function'),
  item('go', 'Concurrency', 'Goroutines: start work without waiting for it'),
  item('go', 'Modules', 'go.mod: one file names every dependency'),
  item('go', 'Concurrency', 'A goroutine leak: work that never ends', M),
  item('go', 'Concurrency', 'The Go scheduler: many goroutines on a few threads', H),
  item('go', 'Slices', 'Sort a slice with sort.Slice'),
  { ...item('go', 'Slices', 'Sort a map by its keys'), paused: true },
];

/** A learner's depth on some of the lessons the search finds, for their squares. */
export const lessonDepths: Record<string, LearnDepth> = {
  [slugOf('go.mod: one file names every dependency')]: 'LEARNED',
  [slugOf('Sort before you search')]: 'PRACTISED',
  [slugOf('Merge sort: split, sort, merge')]: 'LEARNED',
  [slugOf('Sort a slice with sort.Slice')]: 'LEARNED',
};
