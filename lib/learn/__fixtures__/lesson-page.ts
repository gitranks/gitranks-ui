import { type HighlightedCode, plainCodeOf } from '../code-tokens';
import type { LearnAnswerState } from '../learn-answer';
import { type LearnCode, type LearnQuestion, verdictOf } from '../learn-question';
import type { LearnDepth, LearnGroupLesson, LearnLesson, LearnLessonMine } from '../lesson-page';
import { answerAfter, mythQuestion, outputQuestion, pickLineQuestion } from './learn-question';
import { hasDuplicateCodes, nestedLoopCodes } from './player';

/*
 * A lesson's page, as the design catalogue draws it: "Find duplicates in one pass with a set" in a short and a full-size
 * text, its group of nine, a regex lesson of a language course for the Mastered board, and the person's side of each.
 */

/** The catalogue's clock: every board is drawn at this moment. */
export const LESSON_NOW = new Date('2026-10-28T12:00:00.000Z');

const plain = (code: HighlightedCode) =>
  `${code.lines.map((line) => line.map((token) => token.text).join('')).join('\n')}\n`;

/** The example in the four languages the highlighted fixture does not hold. */
const moreCodes: LearnCode[] = [
  {
    language: 'rust',
    code: 'fn has_duplicate(nums: &[i32]) -> bool {\n    let mut seen = HashSet::new();\n    for n in nums {\n        if !seen.insert(n) {\n            return true;\n        }\n    }\n    false\n}\n',
  },
  {
    language: 'java',
    code: 'static boolean hasDuplicate(int[] nums) {\n    Set<Integer> seen = new HashSet<>();\n    for (int n : nums) {\n        if (!seen.add(n)) return true;\n    }\n    return false;\n}\n',
  },
  {
    language: 'php',
    code: 'function hasDuplicate(array $nums): bool {\n    $seen = [];\n    foreach ($nums as $n) {\n        if (isset($seen[$n])) return true;\n        $seen[$n] = true;\n    }\n    return false;\n}\n',
  },
  {
    language: 'ruby',
    code: 'def has_duplicate?(nums)\n  seen = Set.new\n  nums.each do |n|\n    return true if seen.include?(n)\n    seen.add(n)\n  end\n  false\nend\n',
  },
];

/** The main example in the seven languages of a topic course: three highlighted, four plain. */
export const setExampleCodes: HighlightedCode[] = [
  hasDuplicateCodes[0],
  hasDuplicateCodes[1],
  hasDuplicateCodes[2],
  ...moreCodes.map(plainCodeOf),
];

const setExample = {
  name: 'main',
  codes: [...hasDuplicateCodes.map((code) => ({ language: code.language, code: plain(code) })), ...moreCodes],
};

/** The lesson's own question, keyed: the page grades it. */
export const setQuestion: LearnQuestion = {
  id: 'q-set-checks',
  type: 'PICK_ONE',
  prompt: 'The list has 1,000,000 numbers, all different. How many times does the function check the set?',
  example: 'main',
  visual: null,
  codes: [],
  content: {
    options: [
      {
        text: 'About 20, because it halves the list each time',
        right: false,
        why: 'Halving the list is binary search, and that needs a sorted list. This function looks at every number once.',
      },
      {
        text: '1,000,000, once for each number',
        right: true,
        why: 'It goes through the list once and checks the set once per number.',
      },
      {
        text: 'About 500 billion, once for each pair',
        right: false,
        why: 'That is the slow way, which compares every pair. The set is checked once for each number.',
      },
    ],
  },
};

const SHORT_BODY = [
  'The slow way to find a duplicate is to compare **every item with every other item**. For a million items, that is about 500 billion comparisons.',
  '',
  'The fast way: keep a **set of the items you have already seen**. For each new item, check if it is in the set. That check takes the same short time however big the set gets, which is called *constant time*. So you go through the list only once.',
].join('\n');

const FULL_BODY = [
  'Finding out whether a list has a duplicate looks simple, and the simple way is slow.',
  '',
  '**The slow way.** Compare every item with every other item. With 1,000 items that is about 500,000 comparisons. With',
  'a million items it is about 500 billion, which is minutes of work for something that should take a moment. The work',
  'grows with the *square* of the size: a list ten times longer takes a hundred times longer.',
  '',
  '**The idea.** Go through the list once and keep a **set of the items you have already seen**. For each new item, ask',
  'the set one question: have I seen this before? If yes, you found a duplicate and can stop. If no, add the item and',
  'move on.',
  '',
  '[[example: main]]',
  '',
  '**Why it is fast.** A set does not search through its items. It works out a number from the item, called a hash, and',
  'looks in the one place that number points to. So the check takes about the same short time for 10 items and for 10',
  'million. This is called *constant time*. One pass with a constant-time check is *linear time*: a list ten times',
  'longer takes ten times longer.',
  '',
  '**What it costs.** Memory. The set holds every different item it has seen, so in the worst case it grows as large as',
  'the list.',
  '',
  '**When it does not fit.** The items must be something a set can hold, such as numbers or strings. And a set forgets',
  'order: if you need to know *where* the first copy was, keep a hash map from the item to its position instead.',
].join('\n');

/** The lesson with the short text the first boards draw. */
export const setLesson: LearnLesson = {
  slug: 'find-duplicates-with-a-set',
  title: 'Find duplicates in one pass with a set',
  level: 'EASY',
  body: SHORT_BODY,
  course: { slug: 'algorithms', title: 'Algorithms and data structures' },
  group: { slug: 'hash-maps-and-sets', title: 'Hash maps and sets' },
  examples: [setExample],
  visuals: {},
  question: setQuestion,
  say: 'To find duplicates, I keep a set of the items I have already seen. For each item I check the set first, which takes constant time on average. So the search takes linear time instead of quadratic time, and it uses extra memory for the set.',
  fact: {
    title: 'How one web request froze a server',
    text: 'In 2011, researchers showed that one web request could keep a server busy for minutes. The request had thousands of form fields, all chosen to land in the same hash bucket. Since then, Python and Ruby pick new random hashes for strings every time they start, and PHP limits how many fields a request can have.',
    source: '28C3 talk, 2011',
    url: 'https://events.ccc.de/congress/2011/Fahrplan/events/4680.en.html',
  },
  deeper:
    'Show me how a hash set is built: buckets, the hash function, and what happens when two items land in the same bucket. Then show a case where a set is slower than a sorted list, with numbers.',
  buildsOn: [{ slug: 'how-a-hash-map-finds-a-key', title: 'How a hash map finds a key' }],
  previous: { slug: 'how-a-hash-map-finds-a-key', title: 'How a hash map finds a key' },
  next: { slug: 'count-things-with-a-hash-map', title: 'Count things with a hash map' },
  changedAt: '2026-10-21T09:00:00.000Z',
  publishedAt: '2026-10-14T09:00:00.000Z',
};

/** The same lesson at its right size: the example where the text reaches it. */
export const setLessonFull: LearnLesson = { ...setLesson, body: FULL_BODY };

/** The same lesson as the last of its group: Next goes to the next group. */
export const setLessonLast: LearnLesson = {
  ...setLesson,
  next: { slug: 'push-and-pop-a-stack', title: 'Stacks and queues' },
};

/** The same lesson with a table placed in its text. */
export const setLessonWithVisual: LearnLesson = {
  ...setLesson,
  body: `${SHORT_BODY}\n\n[[visual: growth]]\n\n[[example: main]]`,
  visuals: {
    growth: {
      type: 'table',
      caption: 'Comparisons to find a duplicate',
      columns: ['Items', 'Every pair', 'With a set'],
      rows: [
        ['1,000', 'about 500,000', '1,000'],
        ['1,000,000', 'about 500 billion', '1,000,000'],
      ],
      ring: 1,
    },
  },
};

const lesson = (slug: string, title: string, level: LearnGroupLesson['level'] = 'EASY'): LearnGroupLesson => ({
  slug,
  title,
  level,
  paused: false,
});

/** "Hash maps and sets": nine lessons, this one the third. */
export const setGroup: LearnGroupLesson[] = [
  lesson('what-a-hash-is', 'What a hash is'),
  lesson('how-a-hash-map-finds-a-key', 'How a hash map finds a key'),
  lesson('find-duplicates-with-a-set', 'Find duplicates in one pass with a set'),
  lesson('count-things-with-a-hash-map', 'Count things with a hash map'),
  lesson('group-items-by-a-key', 'Group items by a key'),
  lesson('two-sum-with-a-hash-map', 'Find a pair that adds up to a number', 'MEDIUM'),
  lesson('when-two-keys-land-in-one-place', 'When two keys land in one place', 'MEDIUM'),
  lesson('keep-a-hash-map-small', 'Keep a hash map small', 'MEDIUM'),
  lesson('a-set-of-sets', 'A set of sets', 'HARD'),
];

/** The same group with this lesson moved to the end: the last of its group. */
export const setGroupLast: LearnGroupLesson[] = [
  ...setGroup.filter((entry) => entry.slug !== setLesson.slug),
  setGroup[2],
];

const depthsOf = (group: readonly LearnGroupLesson[], depths: readonly LearnDepth[]) =>
  Object.fromEntries(group.flatMap((entry, index) => (depths[index] ? [[entry.slug, depths[index]]] : [])));

/** A member who learned the two lessons before this one. */
export const setDepths = depthsOf(setGroup, ['LEARNED', 'LEARNED']);

/** A member about to finish the group: every other lesson learned, some practised. */
export const setDepthsLast = depthsOf(setGroupLast, [
  'PRACTISED',
  'PRACTISED',
  'LEARNED',
  'PRACTISED',
  'LEARNED',
  'LEARNED',
  'LEARNED',
  'LEARNED',
]);

/** The person's side before an answer. */
export const mineNew: LearnLessonMine = {
  depth: 'NONE',
  known: false,
  learnedAt: null,
  dueAt: null,
  picked: null,
  language: null,
  tries: null,
  feedbackGood: null,
};

/** Right now: learned, asked again in three days. */
export const mineLearned: LearnLessonMine = {
  depth: 'LEARNED',
  known: false,
  learnedAt: '2026-10-28T11:58:00.000Z',
  dueAt: '2026-10-31T00:00:00.000Z',
  picked: 1,
  language: null,
  tries: 1,
  feedbackGood: null,
};

/** Learned before, rated Good: the lesson opened again. */
export const mineLearnedRated: LearnLessonMine = { ...mineLearned, feedbackGood: true };

/** A wrong pick, crossed out and said why: the person picks again. */
export const setAnswerWrong: LearnAnswerState = answerAfter(setQuestion, [
  { type: 'pick', at: 0 },
  { type: 'graded', verdict: verdictOf(setQuestion, 0, null)! },
]);

/** The right pick, graded on the page. */
export const setAnswerRight: LearnAnswerState = answerAfter(setQuestion, [
  { type: 'pick', at: 1 },
  { type: 'graded', verdict: verdictOf(setQuestion, 1, null)! },
]);

/** A regex lesson of the JavaScript course, mastered: a fix that used it was merged. */
export const regexQuestion: LearnQuestion = {
  id: 'q-regex-split',
  type: 'PICK_ONE',
  prompt: "What does `'2024--01---15'.split(/-+/)` return?",
  example: 'main',
  visual: null,
  codes: [],
  content: {
    options: [
      {
        text: "`['2024', '', '01', '', '', '15']`",
        right: false,
        why: 'That is `split(/-/)`: one dash a separator, so a run of dashes leaves empty strings.',
      },
      { text: "`['2024--01---15']`", right: false, why: '`-+` matches the dashes, so the string is split.' },
      {
        text: "`['2024', '01', '15']`",
        right: true,
        why: 'Each run of dashes is one separator, so there are no empty strings.',
      },
    ],
  },
};

const regexCode =
  "'a   b'.replace(/ /g, '-')    // 'a---b'   one match per space\n'a   b'.replace(/ +/g, '-')   // 'a-b'     one match for the run\n";

/** The regex example, in the one language of its course. */
export const regexExampleCodes: HighlightedCode[] = [plainCodeOf({ language: 'javascript', code: regexCode })];

export const regexLesson: LearnLesson = {
  slug: 'regex-plus-means-one-or-more',
  title: 'In a regex, + means “one or more”',
  level: 'EASY',
  body: 'A quantifier says **how many times** the thing before it can repeat: `+` is one or more, `*` is zero or more, `?` is zero or one.\n\nWithout a quantifier, a character class matches exactly one character. That is why three spaces used to become three dashes.',
  course: { slug: 'javascript', title: 'JavaScript' },
  group: { slug: 'strings-and-regex', title: 'Strings and regex' },
  examples: [{ name: 'main', codes: [{ language: 'javascript', code: regexCode }] }],
  visuals: {},
  question: regexQuestion,
  say: 'A quantifier tells the regex how many times the item before it can repeat. `+` means one or more, `*` zero or more and `?` zero or one. Without a quantifier, a character class matches exactly one character.',
  fact: {
    title: 'A regex that remembers where it stopped',
    text: 'A regex with the g flag remembers where it stopped. Test it twice on the same text and the second answer can be false, because it starts after the first match.',
    source: 'MDN Web Docs',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/lastIndex',
  },
  deeper:
    'Show me five regexes with `+`, `*` and `?` that look alike but match different strings, and ask me what each matches before you tell me.',
  buildsOn: [],
  previous: { slug: 'match-one-character-from-a-list', title: 'Match one character from a list' },
  next: { slug: 'match-the-start-and-the-end', title: 'Match the start and the end of a string' },
  changedAt: '2026-10-21T09:00:00.000Z',
  publishedAt: '2026-10-14T09:00:00.000Z',
};

/** "Strings and regex": fourteen lessons, this one the sixth. */
export const regexGroup: LearnGroupLesson[] = [
  lesson('strings-are-read-only', 'Strings cannot be changed in place'),
  lesson('join-strings-with-a-template', 'Join strings with a template'),
  lesson('split-a-string', 'Split a string into parts'),
  lesson('find-text-in-a-string', 'Find text in a string'),
  lesson('match-one-character-from-a-list', 'Match one character from a list'),
  lesson('regex-plus-means-one-or-more', 'In a regex, + means “one or more”'),
  lesson('match-the-start-and-the-end', 'Match the start and the end of a string'),
  lesson('capture-part-of-a-match', 'Capture part of a match', 'MEDIUM'),
  lesson('name-a-capture', 'Name a capture', 'MEDIUM'),
  lesson('replace-with-a-function', 'Replace with a function', 'MEDIUM'),
  lesson('the-g-flag', 'What the g flag changes', 'MEDIUM'),
  lesson('look-ahead', 'Look ahead without matching', 'HARD'),
  lesson('unicode-in-a-regex', 'Letters beyond English in a regex', 'HARD'),
  lesson('a-regex-that-takes-minutes', 'Why a regex can take minutes', 'HARD'),
];

export const regexDepths = depthsOf(regexGroup, ['PRACTISED', 'PRACTISED', 'LEARNED', 'LEARNED', 'LEARNED']);

/** Mastered by a merged fix: never asked again. */
export const mineMastered: LearnLessonMine = {
  depth: 'MASTERED',
  known: false,
  learnedAt: '2026-10-09T10:00:00.000Z',
  dueAt: null,
  picked: 2,
  language: null,
  tries: 1,
  feedbackGood: true,
};

const countPairs = {
  python:
    'def count_pairs(nums):\n    count = 0\n    for i in range(len(nums)):\n        for j in range(i + 1, len(nums)):\n            count += 1\n    return count\n',
  javascript:
    'function countPairs(nums) {\n  let count = 0;\n  for (let i = 0; i < nums.length; i++) {\n    for (let j = i + 1; j < nums.length; j++) {\n      count++;\n    }\n  }\n  return count;\n}\n',
};

const hasDuplicateJs =
  'function hasDuplicate(nums) {\n  const n = nums.length;\n  for (let i = 0; i < n; i++) {\n    for (let j = i + 1; j < n; j++) {\n      if (nums[i] === nums[j]) return true;\n    }\n  }\n  return false;\n}\n';

/** A lesson's `pick-line`, in Python and JavaScript: the inner loop is line 3 in one and line 4 in the other. */
export const loopQuestion: LearnQuestion = {
  ...pickLineQuestion,
  codes: [...pickLineQuestion.codes, { language: 'javascript', code: hasDuplicateJs }],
  content: { ...(pickLineQuestion.content as Record<string, unknown>), rightLine: { python: 3, javascript: 4 } },
};

/** The pick-line question's code, Python highlighted and JavaScript plain. */
export const loopQuestionCodes: HighlightedCode[] = [
  nestedLoopCodes[0],
  plainCodeOf({ language: 'javascript', code: hasDuplicateJs }),
];

/** Its example, in the two languages. */
export const loopExampleCodes: HighlightedCode[] = [
  plainCodeOf({ language: 'python', code: countPairs.python }),
  plainCodeOf({ language: 'javascript', code: countPairs.javascript }),
];

/** A lesson whose question is a line to click. */
export const loopLesson: LearnLesson = {
  ...setLesson,
  slug: 'big-o-of-two-loops',
  title: 'Big-O of two loops',
  body: 'One loop over a list does one step per item: **linear time**. A loop inside a loop does one step for **every pair** of items. For 1,000 items that is about 500,000 steps.\n\nSo when you look for what makes code slow, look for a loop that starts again for each item of another loop.',
  course: { slug: 'algorithms', title: 'Algorithms and data structures' },
  group: { slug: 'big-o', title: 'Big-O' },
  examples: [
    {
      name: 'main',
      codes: [
        { language: 'python', code: countPairs.python },
        { language: 'javascript', code: countPairs.javascript },
      ],
    },
  ],
  question: loopQuestion,
  say: 'A loop inside a loop over the same list does one step for every pair of items, so it takes quadratic time. Doubling the list makes it four times slower.',
  fact: null,
  deeper:
    'Show me three functions with two loops each, one of them linear in fact, and ask me which is which before you tell me.',
  buildsOn: [],
  previous: { slug: 'one-loop-is-linear', title: 'One loop is linear time' },
  next: { slug: 'halving-is-log-n', title: 'Halving a list is log n' },
};

/** "Big-O": six lessons, this one the third. */
export const loopGroup: LearnGroupLesson[] = [
  lesson('what-big-o-counts', 'What Big-O counts'),
  lesson('one-loop-is-linear', 'One loop is linear time'),
  lesson('big-o-of-two-loops', 'Big-O of two loops'),
  lesson('halving-is-log-n', 'Halving a list is log n', 'MEDIUM'),
  lesson('drop-the-constants', 'Drop the constants', 'MEDIUM'),
  lesson('best-worst-and-average', 'Best, worst and average', 'HARD'),
];

export const loopDepths = depthsOf(loopGroup, ['LEARNED', 'LEARNED']);

/** Learned in JavaScript, line 4: the right line there, not in Python. */
export const mineLoopInJavaScript: LearnLessonMine = {
  ...mineLearned,
  picked: 4,
  language: 'javascript',
  tries: 2,
};

/** Line 2 picked, crossed out and said why: the person picks again. */
export const loopAnswerWrong: LearnAnswerState = answerAfter(loopQuestion, [
  { type: 'pick', at: 1 },
  { type: 'graded', verdict: verdictOf(loopQuestion, 2, 'python')! },
]);

const stackExample =
  'stack = []\nstack.append("a")\nstack.append("b")\nprint(stack.pop())  # b, the last one in\nprint(stack)        # ["a"]\n';

/** A lesson whose question is code to read: what it prints shows once it is answered. */
export const outputLesson: LearnLesson = {
  ...setLesson,
  slug: 'push-and-pop-a-stack',
  title: 'Push and pop a stack',
  body: 'A stack is a pile: you **push** an item on top and **pop** the top one off. So the last item in is the first one out.\n\nIn Python a list is a stack: `append` pushes and `pop` with no index pops.',
  group: { slug: 'stacks-and-queues', title: 'Stacks and queues' },
  examples: [{ name: 'main', codes: [{ language: 'python', code: stackExample }] }],
  question: outputQuestion,
  say: 'A stack gives back the last item put in first. Push and pop both work on the top, so each takes constant time.',
  fact: null,
  deeper: null,
  buildsOn: [],
  previous: { slug: 'a-set-of-sets', title: 'A set of sets' },
  next: { slug: 'a-queue-gives-back-the-first', title: 'A queue gives back the first item in' },
};

export const outputExampleCodes: HighlightedCode[] = [plainCodeOf({ language: 'python', code: stackExample })];
export const outputQuestionCodes: HighlightedCode[] = outputQuestion.codes.map(plainCodeOf);

/** "Stacks and queues": five lessons, this one the first. */
export const outputGroup: LearnGroupLesson[] = [
  lesson('push-and-pop-a-stack', 'Push and pop a stack'),
  lesson('a-queue-gives-back-the-first', 'A queue gives back the first item in'),
  lesson('undo-with-a-stack', 'Undo with a stack'),
  lesson('match-brackets-with-a-stack', 'Match brackets with a stack', 'MEDIUM'),
  lesson('a-queue-from-two-stacks', 'A queue from two stacks', 'HARD'),
];

/** The right output picked: "3". */
export const outputAnswerRight: LearnAnswerState = answerAfter(outputQuestion, [
  { type: 'pick', at: 1 },
  { type: 'graded', verdict: verdictOf(outputQuestion, 1, 'python')! },
]);

/** A myth-or-fact lesson: answered wrong, it is done, but nothing is learned. */
export const mythLesson: LearnLesson = { ...setLesson, question: mythQuestion };
