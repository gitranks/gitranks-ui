import type {
  LearnAttemptLesson,
  LearnStage,
  LessonBlock,
  LessonDiagramEdge,
  LessonDiagramNode,
  LessonDiffLine,
  LessonHead,
  LessonQuestion,
  LessonRun,
  LessonStep,
  LessonStepResult,
  LessonWhy,
} from '../learn.types';

/** A block with every field unset: each block type sets its own. */
const EMPTY_BLOCK: LessonBlock = {
  type: 'TEXT',
  text: null,
  nodes: null,
  edges: null,
  caption: null,
  file: null,
  lines: null,
  mark: null,
  repo: null,
  commit: null,
  path: null,
  fromLine: null,
  toLine: null,
  excerpt: null,
};

export const text = (value: string): LessonBlock => ({ ...EMPTY_BLOCK, type: 'TEXT', text: value });

export const diagramNode = (
  id: string,
  label: string,
  extra: Partial<Omit<LessonDiagramNode, 'id' | 'label'>> = {},
): LessonDiagramNode => ({ id, label, sub: null, tone: 'PLAIN', mono: false, ...extra });

export const diagram = (nodes: LessonDiagramNode[], edges: [string, string][], caption: string): LessonBlock => ({
  ...EMPTY_BLOCK,
  type: 'DIAGRAM',
  nodes,
  edges: edges.map(([from, to]): LessonDiagramEdge => ({ from, to })),
  caption,
});

const line = (kind: LessonDiffLine['kind'], value: string): LessonDiffLine => ({ kind, text: value });

export const diff = (file: string, lines: LessonDiffLine[], mark: number[] = []): LessonBlock => ({
  ...EMPTY_BLOCK,
  type: 'DIFF',
  file,
  lines,
  mark,
});

export const code = (path: string, fromLine: number, excerpt: string): LessonBlock => ({
  ...EMPTY_BLOCK,
  type: 'CODE',
  repo: 'driftwood-js/driftwood',
  commit: '4f1c2ab9e7d3',
  path,
  fromLine,
  toLine: fromLine + excerpt.split('\n').length - 1,
  excerpt,
});

/** The lesson on the driftwood fix: five steps, as the boards draw them. */
export const STEPS: LessonStep[] = [
  {
    id: 's1',
    parts: ['before'],
    title: 'Every navigation rebuilt the layouts',
    blocks: [
      text(
        'Going from `/docs/` to `/docs` showed the same page, yet the router built every nested layout again. State in the layouts was lost on each click.',
      ),
      diagram(
        [
          diagramNode('nav', 'navigate()', { mono: true }),
          diagramNode('resolve', 'resolveLayouts', { mono: true, sub: 'looks up the cache', tone: 'ACCENT' }),
          diagramNode('build', 'build every layout', { tone: 'WARN', sub: 'on every click' }),
        ],
        [
          ['nav', 'resolve'],
          ['resolve', 'build'],
        ],
        'Before the fix: each navigation ends in a full rebuild.',
      ),
    ],
  },
  {
    id: 's2',
    parts: ['cause'],
    title: 'Two spellings of one route got two cache entries',
    blocks: [
      text('The router keeps built layouts in a cache. The key was `route.path`, the text of the path as typed.'),
      text(
        '`/docs/` and `/docs` show the same page, but they are different strings. The cache saw two keys, missed on the second and built every layout again.',
      ),
      diagram(
        [
          diagramNode('a', '/docs/', { mono: true }),
          diagramNode('b', '/docs', { mono: true }),
          diagramNode('key', 'cache key = route.path', { sub: 'the raw text of the path', tone: 'ACCENT' }),
          diagramNode('one', '"/docs/"', { mono: true, sub: 'entry 1: layouts built' }),
          diagramNode('two', '"/docs"', { mono: true, sub: 'no entry: built again', tone: 'WARN' }),
        ],
        [
          ['a', 'key'],
          ['b', 'key'],
          ['key', 'one'],
          ['key', 'two'],
        ],
        'Before the fix: one page, two cache keys.',
      ),
    ],
  },
  {
    id: 's3',
    parts: ['fix'],
    title: 'The fix: one spelling before the lookup',
    blocks: [
      text('`normalizePath` now runs first and drops the last slash, so both spellings give one key.'),
      text('The next two lines look the key up and return the layouts when they are already built.'),
      diagram(
        [
          diagramNode('a', '/docs/', { mono: true }),
          diagramNode('b', '/docs', { mono: true }),
          diagramNode('norm', 'normalizePath', { mono: true, sub: 'drops the last slash', tone: 'ACCENT' }),
          diagramNode('one', '"/docs"', { mono: true, sub: 'one entry, built once' }),
        ],
        [
          ['a', 'norm'],
          ['b', 'norm'],
          ['norm', 'one'],
        ],
        'After the fix: both spellings reach one entry.',
      ),
      diff(
        'src/router/layout-cache.ts',
        [
          line('HUNK', '@@ -40,5 +40,7 @@ export function resolveLayouts(route: Route) {'),
          line('CTX', '   const cache = getLayoutCache()'),
          line('DEL', '-  const key = route.path'),
          line('ADD', '+  const key = normalizePath(route.path)'),
          line('ADD', '+  const hit = cache.get(key)'),
          line('ADD', '+  if (hit) return hit'),
          line('CTX', '   return build(key)'),
          line('CTX', ' }'),
        ],
        [3, 4, 5],
      ),
    ],
  },
  {
    id: 's4',
    parts: ['connects'],
    title: 'Who calls resolveLayouts',
    blocks: [
      text(
        'Two places ask for layouts: the router on each navigation, and the prefetcher when a link comes into view.',
      ),
      diagram(
        [
          diagramNode('router', 'Router.navigate', { mono: true }),
          diagramNode('prefetch', 'Link prefetch', { sub: 'when a link is seen' }),
          diagramNode('resolve', 'resolveLayouts', { mono: true, tone: 'ACCENT' }),
          diagramNode('cache', 'layout cache', { sub: 'one entry per route' }),
        ],
        [
          ['router', 'resolve'],
          ['prefetch', 'resolve'],
          ['resolve', 'cache'],
        ],
        'Both callers now share one cache entry per route.',
      ),
      code(
        'src/router/prefetch.ts',
        18,
        'export function prefetch(href: string) {\n  const route = matchRoute(href)\n  if (route) resolveLayouts(route)\n}',
      ),
    ],
  },
  {
    id: 's5',
    parts: ['deep_dive'],
    title: 'Map keys match strings exactly',
    blocks: [
      text(
        'A `Map` compares string keys by their exact characters. It never trims, lowercases or drops a slash, so the same page under two spellings is two keys.',
      ),
      code(
        'test/layout-cache.spec.ts',
        7,
        "const cache = new Map()\ncache.set('/docs/', 1)\ncache.get('/docs') // undefined",
      ),
    ],
  },
];

const option = (id: string, value: string) => ({ id, text: value });

export const question = (
  id: string,
  stepId: string,
  prompt: string,
  options: [string, string][],
  extra: Partial<LessonQuestion> = {},
): LessonQuestion => ({
  id,
  stepId,
  role: 'STEP',
  type: 'SINGLE',
  prompt,
  options: options.map(([optionId, value]) => option(optionId, value)),
  ...extra,
});

export const WARMUP: LessonQuestion[] = [
  question(
    'w1',
    's1',
    'What does “normalising” a path mean?',
    [
      ['w1a', 'Turning equal paths into one spelling'],
      ['w1b', 'Encoding it so it is safe in a URL'],
      ['w1c', 'Checking that the page exists'],
    ],
    { role: 'WARMUP' },
  ),
  question(
    'w2',
    's2',
    'Are `/docs/` and `/docs` the same key in a JavaScript `Map`?',
    [
      ['w2a', 'Yes, a Map ignores the last slash'],
      ['w2b', 'No, they are two different strings'],
      ['w2c', 'Only when the Map is created with a compare function'],
    ],
    { role: 'WARMUP' },
  ),
  question(
    'w3',
    's4',
    'In a router, what is a layout?',
    [
      ['w3a', 'The part of the page shared by several routes, wrapped around them'],
      ['w3b', 'The CSS grid of a page'],
      ['w3c', 'The list of all routes'],
    ],
    { role: 'WARMUP' },
  ),
];

/** Step 2's two questions: the one asked first, and the one asked after a wrong answer. */
export const CAUSE_QUESTION = question('q2a', 's2', 'Why did the cache miss when you went from /docs/ to /docs?', [
  ['q2a1', 'The cache was emptied on every navigation'],
  ['q2a2', 'The two paths are different strings, so they were different keys'],
  ['q2a3', 'Nested routes can never be cached'],
]);
export const CAUSE_AGAIN = question('q2b', 's2', 'Before the fix, which pair of addresses reused one cache entry?', [
  ['q2b1', '`/docs/` and `/docs`'],
  ['q2b2', '`/docs` and `/docs`'],
  ['q2b3', '`/Docs` and `/docs`'],
]);
export const BEFORE_QUESTION = question('q1a', 's1', 'What did a navigation between two spellings of one page do?', [
  ['q1a1', 'It built every nested layout again'],
  ['q1a2', 'It showed a 404'],
  ['q1a3', 'It reloaded the whole page from the server'],
]);
export const FIX_QUESTION = question(
  'q3a',
  's3',
  'What does the fix change?',
  [
    ['q3a1', 'The path is normalised before it becomes the cache key'],
    ['q3a2', 'The cache is emptied after each navigation'],
    ['q3a3', 'Layouts that are already built are returned at once'],
    ['q3a4', 'Layouts are no longer cached'],
  ],
  { type: 'MULTI' },
);

/** The why of a wrong pick on step 2's first question: the hint. */
export const CAUSE_HINT: LessonWhy[] = [
  {
    optionId: 'q2a1',
    correct: false,
    why: 'Not quite. Nothing empties the cache: look at what the key is in the diagram.',
  },
];

/** Every option's why on the fix's question, after a right answer. */
export const FIX_WHY: LessonWhy[] = [
  {
    optionId: 'q3a1',
    correct: true,
    why: '`normalizePath` runs before the key is made, so both spellings give one key.',
  },
  { optionId: 'q3a2', correct: false, why: 'Nothing empties the cache; it keeps every route it built.' },
  { optionId: 'q3a3', correct: true, why: 'The two new lines return a cache hit before anything is built.' },
  { optionId: 'q3a4', correct: false, why: 'The cache stays; it now has one entry per route.' },
];

export const HEAD: LessonHead = {
  slug: 'route-cache-miss-8f3k',
  title: 'Why nested layouts rebuilt on every navigation',
  kind: 'fix',
  version: 1,
  author: { login: 'octocat', agentName: 'Claude Code', agentFamily: 'Opus' },
  subject: {
    type: 'ISSUE',
    repo: 'driftwood-js/driftwood',
    issue: 871,
    issueTitle: 'Nested layouts re-render on every navigation',
    pr: null,
    prUrl: null,
  },
  language: 'TypeScript',
  publishedAt: null,
  passes: 1,
  writtenFor: 'learn TypeScript, level Some',
  topics: ['Cache keys', 'Path normalisation', 'How driftwood resolves layouts', 'Map key equality'],
};

const results = (states: LessonStepResult['state'][], tries: number[] = []): LessonStepResult[] =>
  STEPS.map((step, index) => ({ stepId: step.id, state: states[index] ?? 'OPEN', tries: tries[index] ?? 0 }));

export const run = (patch: Partial<LessonRun> = {}): LessonRun => ({
  id: 'RUN_1',
  version: 1,
  steps: results([]),
  warmup: [],
  current: { question: BEFORE_QUESTION, label: 'Question', hint: [] },
  blocked: false,
  liked: [],
  worthIt: null,
  resultPublic: true,
  startedAt: '2026-10-28T11:10:00.000Z',
  passedAt: null,
  summary: null,
  ...patch,
});

/** The run at each point the boards draw. */
export const runs = {
  warmup: run({ warmup: WARMUP }),
  /** Step 1 passed; step 2's first question. */
  step: run({
    steps: results(['FIRST_TRY'], [1]),
    current: { question: CAUSE_QUESTION, label: 'Question', hint: [] },
  }),
  /** A wrong answer on step 2: its other question, with the hint. */
  askAgain: run({
    steps: results(['FIRST_TRY'], [1]),
    current: { question: CAUSE_AGAIN, label: 'Try this one', hint: CAUSE_HINT },
    liked: [{ questionId: 'q2a', liked: true }],
  }),
  /** Step 2 known from the warm-up; step 3 answered right, its run moved on to step 4. */
  right: run({
    steps: results(['FIRST_TRY', 'KNEW', 'FIRST_TRY'], [1, 0, 1]),
    current: {
      question: question('q4a', 's4', 'Who calls resolveLayouts?', [
        ['q4a1', 'The router and the prefetcher'],
        ['q4a2', 'Only the server'],
        ['q4a3', 'Every component'],
      ]),
      label: 'Question',
      hint: [],
    },
  }),
  /** A second step with every question reported. */
  blocked: run({
    steps: results(['FIRST_TRY', 'REPORTED', 'FIRST_TRY', 'REPORTED'], [1, 0, 2, 0]),
    current: null,
    blocked: true,
  }),
  passed: run({
    steps: results(['FIRST_TRY', 'KNEW', 'TRY_N', 'FIRST_TRY', 'FIRST_TRY'], [1, 0, 2, 1, 1]),
    current: null,
    passedAt: '2026-10-28T11:21:00.000Z',
    summary: { knewBefore: 1, learned: 2, minutes: 11 },
  }),
};

export const lesson = (stage: LearnStage, patch: Partial<LearnAttemptLesson> = {}): LearnAttemptLesson => {
  const working = stage === 'AGENT_WORKING' || stage === 'AGENT_REWRITING';
  return {
    attemptId: 'A_1',
    stage,
    head: working ? null : HEAD,
    steps: working ? null : STEPS,
    run: null,
    shareUrl: null,
    resultUrl: null,
    counts: null,
    visibility: working ? null : 'PRIVATE',
    ...patch,
  };
};

/** The lesson at every stage of an attempt. */
export const lessons = {
  working: lesson('AGENT_WORKING'),
  rewriting: lesson('AGENT_REWRITING'),
  warmup: lesson('WARMUP', { run: runs.warmup }),
  step: lesson('LESSON', { run: runs.step }),
  askAgain: lesson('LESSON', { run: runs.askAgain }),
  right: lesson('LESSON', { run: runs.right }),
  blocked: lesson('BLOCKED', { run: runs.blocked }),
  ready: lesson('READY_TO_APPROVE', { run: runs.passed }),
  prOpen: lesson('PR_OPEN', {
    head: {
      ...HEAD,
      publishedAt: '2026-10-28T11:30:00.000Z',
      passes: 14,
      subject: { ...HEAD.subject, pr: 902, prUrl: 'https://github.com/driftwood-js/driftwood/pull/902' },
    },
    run: { ...runs.passed, worthIt: true },
    visibility: 'PUBLIC',
    shareUrl: 'https://gitranks.com/learn/lessons/route-cache-miss-8f3k',
    resultUrl: 'https://gitranks.com/learn/lessons/route-cache-miss-8f3k/passes/octocat',
    counts: { opens: 38, passes: 14, reactionsYes: 1, reactionsNo: 0, reported: 0 },
  }),
  handPr: lesson('HAND_PR', { run: runs.step }),
  ended: lesson('ENDED'),
};
