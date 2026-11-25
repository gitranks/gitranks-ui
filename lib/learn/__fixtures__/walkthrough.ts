import type { LessonRun, LessonStep } from '../learn.types';
import type { LearnAnswerState } from '../learn-answer';
import { type LearnQuestion, verdictOf } from '../learn-question';
import {
  type FixMine,
  playerQuestionOf,
  type Walkthrough,
  type WalkthroughAnswers,
  type WalkthroughPart,
} from '../walkthrough';
import { answerAfter } from './learn-question';
import type { LessonBlock } from '@/lib/workspace/blocks/block.types';

/*
 * A fix's walkthrough, as the design catalogue draws it: octocat's fix of acme/widgets #42 (pull request #57), four parts
 * with a question each, the lesson it used, octocat's answers, and the fixer's run before the pull request opens.
 */

const EMPTY: LessonBlock = {
  type: 'TEXT',
  text: null,
  nodes: null,
  edges: null,
  caption: null,
  layout: null,
  file: null,
  lines: null,
  mark: null,
  repo: null,
  commit: null,
  path: null,
  fromLine: null,
  toLine: null,
  excerpt: null,
  compareOf: null,
  before: null,
  after: null,
  columns: null,
  rows: null,
  ring: null,
};

const text = (value: string): LessonBlock => ({ ...EMPTY, type: 'TEXT', text: value });

export const WALKTHROUGH_PR = { nameWithOwner: 'acme/widgets', number: 57 };

export const walkthroughParts: WalkthroughPart[] = [
  {
    id: 'before',
    heading: 'What went wrong',
    blocks: [
      text('Saving a widget with an empty name wrote a row the list page could not read, so the list failed to load.'),
      {
        ...EMPTY,
        type: 'DIAGRAM',
        layout: 'FLOW',
        nodes: [
          { id: 'form', label: 'Form', sub: 'name: ""', tone: 'PLAIN', mono: false },
          { id: 'save', label: 'saveWidget()', sub: null, tone: 'WARN', mono: true },
          { id: 'list', label: 'List page', sub: 'fails', tone: 'WARN', mono: false },
        ],
        edges: [
          { from: 'form', to: 'save', label: null, reply: false, tone: 'PLAIN' },
          { from: 'save', to: 'list', label: 'bad row', reply: false, tone: 'WARN' },
        ],
        caption: 'An empty name went all the way to the list.',
      },
    ],
    question: {
      id: 'q-before',
      multi: false,
      prompt: 'Why did the list page fail?',
      options: [
        { id: 'a', text: 'The list page had a typo', right: false, why: 'The list page did not change in this fix.' },
        {
          id: 'b',
          text: 'A row with an empty name was saved',
          right: true,
          why: 'Nothing stopped an empty name, and the list could not read that row.',
        },
        { id: 'c', text: 'The database was down', right: false, why: 'The save worked; it saved the wrong thing.' },
      ],
    },
  },
  {
    id: 'fix',
    heading: 'The check before saving',
    blocks: [
      text('The fix checks the name before the row is written, and says what is wrong.'),
      {
        ...EMPTY,
        type: 'DIFF',
        file: 'src/widgets/save.ts',
        lines: [
          { kind: 'HUNK', text: '@@ -12,6 +12,9 @@ export function saveWidget(widget: Widget) {' },
          { kind: 'CTX', text: ' export function saveWidget(widget: Widget) {' },
          { kind: 'ADD', text: '+  if (!widget.name.trim()) {' },
          { kind: 'ADD', text: "+    throw new Error('A widget needs a name');" },
          { kind: 'ADD', text: '+  }' },
          { kind: 'CTX', text: '   return db.insert(widget);' },
        ],
        mark: [2, 3],
      },
    ],
    question: {
      id: 'q-fix',
      multi: false,
      prompt: 'What does the new check do with a name of only spaces?',
      options: [
        { id: 'a', text: 'Saves it as it is', right: false, why: '`trim()` turns spaces into an empty name first.' },
        { id: 'b', text: 'Refuses it', right: true, why: '`trim()` leaves nothing, so the check throws.' },
      ],
    },
  },
  {
    id: 'cases',
    heading: 'Which names pass',
    blocks: [
      {
        ...EMPTY,
        type: 'TABLE',
        columns: ['Name', 'Saved?'],
        rows: [
          ['"Gear"', 'Yes'],
          ['""', 'No'],
          ['"   "', 'No'],
        ],
        ring: 2,
        caption: 'Spaces alone count as empty.',
      },
    ],
    question: {
      id: 'q-cases',
      multi: true,
      prompt: 'Which names are refused?',
      options: [
        { id: 'a', text: 'An empty name', right: true, why: 'Nothing is left to save.' },
        { id: 'b', text: 'A name of spaces', right: true, why: 'Trimmed, it is empty.' },
        { id: 'c', text: '"Gear"', right: false, why: 'A real name passes.' },
      ],
    },
  },
  {
    id: 'connects',
    heading: 'Where the error shows',
    blocks: [text('The form already shows an error from `saveWidget`, so the person sees "A widget needs a name".')],
    question: {
      id: 'q-connects',
      multi: false,
      prompt: 'Where does the person read the new error?',
      options: [
        { id: 'a', text: 'In the form, under the name', right: true, why: 'The form shows what the save throws.' },
        { id: 'b', text: 'Only in the server log', right: false, why: 'The form already shows errors from the save.' },
      ],
    },
  },
];

export const walkthrough: Walkthrough = {
  repo: 'acme/widgets',
  issueNumber: 42,
  number: 57,
  title: 'Saving a widget with an empty name breaks the list',
  language: 'TypeScript',
  fixer: 'octocat',
  version: 3,
  lesson: { slug: 'validate-input', title: 'Check input at the edge', course: 'web', courseName: 'Web basics' },
  parts: walkthroughParts,
};

/** The same, with no lesson: the strip leads to Issues. */
export const walkthroughNoLesson: Walkthrough = { ...walkthrough, lesson: null };

/** Each part's question with its key, as the public player takes it. */
export const walkthroughQuestions: LearnQuestion[] = walkthroughParts.map((part) =>
  playerQuestionOf(part.question, true),
);

/** A wrong pick on the first question: crossed out, its reason shown, the question still open. */
export const walkthroughAnswerWrong: LearnAnswerState = answerAfter(walkthroughQuestions[0], [
  { type: 'pick', at: 0 },
  { type: 'graded', verdict: verdictOf(walkthroughQuestions[0], 0, null)! },
]);

/** The last question answered right. */
export const walkthroughAnswerLastRight: LearnAnswerState = answerAfter(walkthroughQuestions[3], [
  { type: 'pick', at: 0 },
  { type: 'graded', verdict: verdictOf(walkthroughQuestions[3], 0, null)! },
]);

/** octocat's answers, shared: three on the first try, one on the second. */
export const octocatAnswers: WalkthroughAnswers = {
  login: 'octocat',
  passedAt: '2026-11-20T10:15:00.000Z',
  shared: true,
  readers: 12,
  walkthrough,
  answers: [
    { question: 'q-before', tries: 1 },
    { question: 'q-fix', tries: 2 },
    { question: 'q-cases', tries: 1 },
    { question: 'q-connects', tries: 1 },
  ],
};

/** The fixer's own answers, kept private. */
export const octocatAnswersPrivate: WalkthroughAnswers = { ...octocatAnswers, shared: false };

/** The answers as everyone but the fixer reads them while they are private. */
export const answersKeptPrivate: WalkthroughAnswers = {
  ...octocatAnswers,
  shared: false,
  walkthrough: null,
  answers: null,
};

/** A signed-in reader who has not answered. */
export const readerMine: FixMine = { fixer: false, held: false, passedAt: null, similar: null };
/** The fixer. */
export const fixerMine: FixMine = { fixer: true, held: false, passedAt: null, similar: null };

/** The fixer's parts, as their run names them. */
export const fixerSteps: LessonStep[] = walkthroughParts.map((part) => ({
  id: part.id,
  parts: [part.id],
  title: part.heading,
  blocks: part.blocks,
}));

const wireOf = (part: WalkthroughPart) => ({
  id: part.question.id,
  stepId: part.id,
  role: 'STEP' as const,
  type: part.question.multi ? ('MULTI' as const) : ('SINGLE' as const),
  prompt: part.question.prompt,
  options: part.question.options.map(({ id, text }) => ({ id, text })),
});

/** The fixer's run: the first part answered, the second asked. */
export const fixerRun: LessonRun = {
  id: 'RUN_W',
  version: 3,
  steps: walkthroughParts.map((part, index) => ({
    stepId: part.id,
    state: index === 0 ? 'FIRST_TRY' : 'OPEN',
    tries: index === 0 ? 1 : 0,
  })),
  warmup: [],
  current: { question: wireOf(walkthroughParts[1]), label: 'Question', hint: [] },
  blocked: false,
  liked: [],
  worthIt: null,
  resultPublic: false,
  startedAt: '2026-11-20T10:00:00.000Z',
  passedAt: null,
  summary: null,
};

/** A version 2 run that asked the part's other question after a wrong pick: the reason over the new question. */
export const fixerRunAskAgain: LessonRun = {
  ...fixerRun,
  current: {
    question: { ...wireOf(walkthroughParts[1]), id: 'q-fix-2', prompt: 'Which line refuses the empty name?' },
    label: 'Try this one',
    hint: [{ optionId: 'a', correct: false, why: '`trim()` turns spaces into an empty name first.' }],
  },
};
