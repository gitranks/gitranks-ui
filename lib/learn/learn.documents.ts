import { parse } from 'graphql';

import type {
  ContributeAttemptMode,
  LearnAttemptLesson,
  LearnProfile,
  LearnProfileInput,
  LessonAnswerResult,
  LessonPage,
  LessonReaction,
  LessonReportReason,
  LessonResultPage,
  LessonResultReaction,
  LessonRun,
  LessonStub,
  LessonWarmupAnswer,
  MyLesson,
} from './learn.types';
import type DocumentNode from '@/types/typed-document-node';

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

/** Whether Learn is open to the signed-in viewer. */
export const LearnOpenDocument = doc<{ learnOpen: boolean }>('query LearnOpen { learnOpen }');

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
  language publishedAt passes writtenFor topics`;

const BLOCK = `type text
  nodes { id label sub tone mono } edges { from to } caption
  file lines { kind text } mark
  repo commit path fromLine toLine excerpt`;

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

/** A Learn attempt's own fields, read beside the attempt so an API without them leaves it as it was. */
export const ContributeAttemptLearnDocument = doc<
  {
    contributeAttempt: {
      attemptId: string;
      mode: ContributeAttemptMode;
      learnActiveAt: string | null;
      learnGatePassed: boolean | null;
    } | null;
  },
  { id: string }
>(`query ContributeAttemptLearn($id: ID!) {
  contributeAttempt(id: $id) { attemptId mode learnActiveAt learnGatePassed }
}`);

type LearnRow = { attemptId: string; mode: ContributeAttemptMode; learnActiveAt: string | null };

/** The attempts' Learn fields, read beside a list of attempts. */
export const ContributeAttemptsLearnDocument = doc<
  { contributeAttempts: LearnRow[] | null },
  { state?: string; first?: number }
>(`query ContributeAttemptsLearn($state: ContributeAttemptState, $first: Int) {
  contributeAttempts(state: $state, first: $first) { attemptId mode learnActiveAt }
}`);

export const ContributeAttemptsInLearnDocument = doc<
  { contributeAttempts: LearnRow[] | null },
  { states: string[]; first?: number }
>(`query ContributeAttemptsInLearn($states: [ContributeAttemptState!], $first: Int) {
  contributeAttempts(states: $states, first: $first) { attemptId mode learnActiveAt }
}`);

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

export const SendQuestionFeedbackDocument = doc<
  { sendQuestionFeedback: boolean },
  { runId: string; questionId: string; liked: boolean }
>(
  `mutation SendQuestionFeedback($runId: ID!, $questionId: ID!, $liked: Boolean!) {
  sendQuestionFeedback(runId: $runId, questionId: $questionId, liked: $liked)
}`,
);

export const ReportQuestionDocument = doc<
  { reportQuestion: LessonRun },
  { runId: string; questionId: string; reason: LessonReportReason }
>(`mutation ReportQuestion($runId: ID!, $questionId: ID!, $reason: LessonReportReason!) {
  reportQuestion(runId: $runId, questionId: $questionId, reason: $reason) { ${RUN} }
}`);

export const LogCopyForAgentDocument = doc<{ logCopyForAgent: boolean }, { runId: string; stepId: string }>(
  'mutation LogCopyForAgent($runId: ID!, $stepId: ID!) { logCopyForAgent(runId: $runId, stepId: $stepId) }',
);

export const RateLessonDocument = doc<{ rateLesson: boolean }, { runId: string; worthIt: boolean }>(
  'mutation RateLesson($runId: ID!, $worthIt: Boolean!) { rateLesson(runId: $runId, worthIt: $worthIt) }',
);

export const RemoveLessonDocument = doc<{ removeLesson: boolean }, { slug: string }>(
  'mutation RemoveLesson($slug: String!) { removeLesson(slug: $slug) }',
);

const PROFILE = 'goalKind goalValue levels { language level guessed hint } focus updatedAt';

/** The viewer's goal, levels and focus; null when Learn is not open to them. */
export const LearnProfileDocument = doc<{ learnProfile: LearnProfile | null }>(
  `query LearnProfile { learnProfile { ${PROFILE} } }`,
);

export const SaveLearnProfileDocument = doc<{ saveLearnProfile: LearnProfile }, { input: LearnProfileInput }>(
  `mutation SaveLearnProfile($input: LearnProfileInput!) { saveLearnProfile(input: $input) { ${PROFILE} } }`,
);

/** The viewer's Learn attempts and the shared lessons they passed. */
export const MyLessonsDocument = doc<{ myLessons: MyLesson[] }>(
  'query MyLessons { myLessons { slug attemptId title repo state passedAt } }',
);

const KEYED_QUESTION = 'id stepId role type prompt options { id text correct why }';

/** A shared lesson as anyone reads it: the same answer for everyone. */
export const LessonPageDocument = doc<{ lessonPage: LessonPage | LessonStub | null }, { slug: string }>(
  `query LessonPage($slug: String!) {
  lessonPage(slug: $slug) {
    __typename
    ... on LessonPage { head { ${HEAD} } steps { ${STEP} } }
    ... on LessonStub { visibility }
  }
}`,
);

/** One login's passed run of a lesson, as anyone reads it. */
export const LessonResultDocument = doc<
  { lessonResult: LessonResultPage | LessonStub | null },
  { slug: string; login: string }
>(`query LessonResult($slug: String!, $login: String!) {
  lessonResult(slug: $slug, login: $login) {
    __typename
    ... on LessonResultPage {
      head { ${HEAD} }
      login loginAtPass githubId version passedAt minutes
      steps { ${STEP} }
      results { stepId state tries }
      asked { ${KEYED_QUESTION} }
      reactions { login role reaction }
    }
    ... on LessonStub { visibility }
  }
}`);

/** The viewer's open run of a shared lesson, else their latest passed one. */
export const MyLessonRunDocument = doc<{ myLessonRun: LessonRun | null }, { slug: string }>(
  `query MyLessonRun($slug: String!) { myLessonRun(slug: $slug) { ${RUN} } }`,
);

export const StartSharedLessonRunDocument = doc<{ startLessonRun: LessonRun }, { slug: string }>(
  `mutation StartSharedLessonRun($slug: String!) { startLessonRun(slug: $slug) { ${RUN} } }`,
);

export const ShareMyResultDocument = doc<{ shareMyResult: LessonRun }, { runId: string; share: boolean }>(
  `mutation ShareMyResult($runId: ID!, $share: Boolean!) { shareMyResult(runId: $runId, share: $share) { ${RUN} } }`,
);

/** The reaction the visitor's GitHub account left on a result page, read with the token of its light sign-in. */
export const MyResultReactionDocument = doc<
  { myResultReaction: LessonReaction | null },
  { slug: string; login: string; token: string }
>(`query MyResultReaction($slug: String!, $login: String!, $token: String!) {
  myResultReaction(slug: $slug, login: $login, token: $token)
}`);

export const ReactToResultDocument = doc<
  { reactToResult: LessonResultReaction[] },
  { slug: string; login: string; reaction: LessonReaction; token: string }
>(`mutation ReactToResult($slug: String!, $login: String!, $reaction: LessonReaction!, $token: String!) {
  reactToResult(slug: $slug, login: $login, reaction: $reaction, token: $token) { login role reaction }
}`);
