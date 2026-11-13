import type {
  LessonPage,
  LessonQuestion,
  LessonQuestionKeyed,
  LessonResultPage,
  LessonStepResult,
  LessonStub,
  LessonVisibility,
} from '../learn.types';
import { BEFORE_QUESTION, CAUSE_AGAIN, CAUSE_QUESTION, HEAD, question, run, STEPS } from './lesson';

/** The driftwood lesson once its pull request is open: public, passed by 14 people. */
export const PUBLIC_HEAD = {
  ...HEAD,
  publishedAt: '2026-10-28T11:30:00.000Z',
  passes: 14,
  subject: { ...HEAD.subject, pr: 902, prUrl: 'https://github.com/driftwood-js/driftwood/pull/902' },
};

export const lessonPage: LessonPage = { __typename: 'LessonPage', head: PUBLIC_HEAD, steps: STEPS };

export const stub = (visibility: LessonVisibility): LessonStub => ({ __typename: 'LessonStub', visibility });

/** A question with its key: `right` names the correct options, `why` each option's line. */
const keyed = (base: LessonQuestion, right: string[], why: Record<string, string>): LessonQuestionKeyed => ({
  ...base,
  options: base.options.map((option) => ({
    ...option,
    correct: right.includes(option.id),
    why: why[option.id] ?? '',
  })),
});

const CONNECTS = question('q4a', 's4', 'Who calls resolveLayouts?', [
  ['q4a1', 'The router, on every navigation, and the prefetcher'],
  ['q4a2', 'Only the server, once per request'],
  ['q4a3', 'Every component that renders a link'],
]);
const DEEP_DIVE = question('q5a', 's5', 'Which two keys does a JavaScript `Map` treat as one?', [
  ['q5a1', 'Two strings with the same characters'],
  ['q5a2', 'Two strings that differ only in a trailing slash'],
  ['q5a3', 'Two different objects with the same fields'],
]);

/** The step questions octocat's run was asked: step 2 twice, step 3 not at all (known from the warm-up). */
export const ASKED: LessonQuestionKeyed[] = [
  keyed(BEFORE_QUESTION, ['q1a1'], {
    q1a1: 'Right: the cache missed, so every nested layout was built again.',
    q1a2: 'Wrong: the page was found; only its layouts were rebuilt.',
    q1a3: 'Wrong: the navigation stayed in the browser.',
  }),
  keyed(CAUSE_QUESTION, ['q2a2'], {
    q2a1: 'Wrong: nothing empties the cache.',
    q2a2: 'Right: the key was the raw text of the path.',
    q2a3: 'Wrong: nested routes are cached like any other.',
  }),
  keyed(CAUSE_AGAIN, ['q2b2'], {
    q2b1: 'Wrong: these were two keys, the bug itself.',
    q2b2: 'Right: the same string is the same key.',
    q2b3: 'Wrong: the case differs, so the strings do.',
  }),
  keyed(CONNECTS, ['q4a1'], {
    q4a1: 'Right: both look layouts up, so both gain from one key.',
    q4a2: 'Wrong: navigations in the browser call it too.',
    q4a3: 'Wrong: links only start a navigation.',
  }),
  keyed(DEEP_DIVE, ['q5a1'], {
    q5a1: 'Right: strings are compared by their characters.',
    q5a2: 'Wrong: a trailing slash makes another string.',
    q5a3: 'Wrong: objects are compared by identity.',
  }),
];

const RESULTS: LessonStepResult[] = [
  { stepId: 's1', state: 'FIRST_TRY', tries: 1 },
  { stepId: 's2', state: 'TRY_N', tries: 2 },
  { stepId: 's3', state: 'KNEW', tries: 0 },
  { stepId: 's4', state: 'FIRST_TRY', tries: 1 },
  { stepId: 's5', state: 'FIRST_TRY', tries: 1 },
];

/** octocat's result: the link in their pull request, with mona's reaction. */
export const result = (patch: Partial<LessonResultPage> = {}): LessonResultPage => ({
  __typename: 'LessonResultPage',
  head: PUBLIC_HEAD,
  login: 'octocat',
  loginAtPass: 'octocat',
  githubId: 583231,
  version: 1,
  passedAt: '2026-10-28T11:21:00.000Z',
  minutes: 11,
  steps: STEPS,
  results: RESULTS,
  asked: ASKED,
  reactions: [{ login: 'mona', role: 'maintainer', reaction: 'YES' }],
  ...patch,
});

/** A shared run at each point the boards draw. */
export const sharedRuns = {
  /** Step 2 asked, an answer picked. */
  step: run({
    id: 'RUN_S',
    resultPublic: false,
    steps: STEPS.map((step, index) => ({
      stepId: step.id,
      state: index === 0 ? 'FIRST_TRY' : 'OPEN',
      tries: index ? 0 : 1,
    })),
    current: { question: CAUSE_QUESTION, label: 'Question', hint: [] },
  }),
  /** Passed; not shared yet. */
  passed: run({
    id: 'RUN_S',
    resultPublic: false,
    steps: RESULTS,
    current: null,
    passedAt: '2026-10-29T09:12:00.000Z',
    summary: { knewBefore: 1, learned: 3, minutes: 9 },
  }),
};
