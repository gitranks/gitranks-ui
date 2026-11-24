import { parse } from 'graphql';

import type { LearnAttemptLesson, LearnRecord, LessonAnswerResult, LessonRun, LessonWarmupAnswer } from './learn.types';
import type DocumentNode from '@/types/typed-document-node';

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

/** A question as a taker sees it: never its key. */
const QUESTION = 'id stepId role type prompt options { id text }';
const WHY = 'optionId correct why';

const RUN = `id version
  steps { stepId state tries }
  warmup { ${QUESTION} }
  current { question { ${QUESTION} } label hint { ${WHY} } }
  blocked
  liked { questionId liked }
  worthIt resultPublic startedAt passedAt
  summary { knewBefore learned minutes }`;

const HEAD = `slug title kind version
  author { login agentName agentFamily }
  subject { type repo issue issueTitle pr prUrl }
  language publishedAt passes writtenFor topics
  writtenForGoal { kind value level }`;

const NODES = 'nodes { id label sub tone mono } edges { from to label reply tone }';
const SIDE = `${NODES} path fromLine toLine excerpt`;
const BLOCK = `type text
  ${NODES} caption layout
  file lines { kind text } mark
  repo commit path fromLine toLine excerpt
  compareOf before { ${SIDE} } after { ${SIDE} }
  columns rows ring`;

const STEP = `id parts title blocks { ${BLOCK} }`;

export const LearnAttemptLessonDocument = doc<{ learnAttemptLesson: LearnAttemptLesson | null }, { attemptId: string }>(
  `query LearnAttemptLesson($attemptId: ID!) {
  learnAttemptLesson(attemptId: $attemptId) {
    attemptId stage
    head { ${HEAD} }
    steps { ${STEP} }
    run { ${RUN} }
    shareUrl resultUrl
    counts { opens passes reactionsYes reactionsNo reported }
    visibility
  }
}`,
);

export const StartLessonRunDocument = doc<{ startLessonRun: LessonRun }, { attemptId: string }>(
  `mutation StartLessonRun($attemptId: ID!) { startLessonRun(attemptId: $attemptId) { ${RUN} } }`,
);

export const AnswerWarmupDocument = doc<{ answerWarmup: LessonRun }, { runId: string; answers: LessonWarmupAnswer[] }>(
  `mutation AnswerWarmup($runId: ID!, $answers: [LessonWarmupAnswer!]!) {
  answerWarmup(runId: $runId, answers: $answers) { ${RUN} }
}`,
);

export const MarkStepShownDocument = doc<{ markStepShown: boolean }, { runId: string; stepId: string }>(
  'mutation MarkStepShown($runId: ID!, $stepId: ID!) { markStepShown(runId: $runId, stepId: $stepId) }',
);

export const AnswerLessonQuestionDocument = doc<
  { answerLessonQuestion: LessonAnswerResult },
  { runId: string; questionId: string; picked: string[] }
>(`mutation AnswerLessonQuestion($runId: ID!, $questionId: ID!, $picked: [ID!]!) {
  answerLessonQuestion(runId: $runId, questionId: $questionId, picked: $picked) {
    correct why { ${WHY} } run { ${RUN} }
  }
}`);

export const RemoveLessonDocument = doc<{ removeLesson: boolean }, { slug: string }>(
  'mutation RemoveLesson($slug: String!) { removeLesson(slug: $slug) }',
);

/** A login's public Learn record, the same for every reader; null without a public pass. */
export const LearnRecordDocument = doc<{ learnRecord: LearnRecord | null }, { login: string }>(
  'query LearnRecord($login: String!) { learnRecord(login: $login) { login lessons newThings topics prsOpened prsMerged reposHelped } }',
);
