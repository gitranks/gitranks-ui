import { parse } from 'graphql';

import type {
  LearnAttemptLesson,
  LearnIssuesAnswer,
  LearnProfile,
  LearnProfileInput,
  LearnPromo,
  LearnPromoPlacement,
  LearnPublicIssuesAnswer,
  LearnRecord,
  LessonAnswerResult,
  LessonPage,
  LessonReaction,
  LessonReportReason,
  LessonResultPage,
  LessonResultReaction,
  LessonRun,
  LessonStub,
  LessonWarmupAnswer,
  MyLearnAttempts,
  PracticeLessons,
  PublicLesson,
} from './learn.types';
import { MASKED_PART } from '@/lib/workspace/masked-issue.fields';
import type DocumentNode from '@/types/typed-document-node';

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

/** Whether Learn is open to every signed-in person: the same answer for everyone, asked without a viewer. */
export const LearnOpenToEveryoneDocument = doc<{ learnOpenToEveryone: boolean }>(
  'query LearnOpenToEveryone { learnOpenToEveryone }',
);

/** Whether the viewer's GitRanks account is still being set up (a new account), so Learn cannot answer for it yet. */
export const LearnSetupDocument = doc<{ learnSetup: boolean }>('query LearnSetup { learnSetup }');

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

/** An issue a lesson can be written for, as a visitor's list words it too: everything but its node id. */
const LEARN_PUBLIC_ISSUE = 'url repo number title language size why';

/** An issue a lesson can be written for: the same fields wherever Learn lists one. */
export const LEARN_ISSUE = `issueId ${LEARN_PUBLIC_ISSUE}`;

const PRACTICE_LESSON = `slug title repo issue issueTitle language
      author { login agentName agentFamily }
      writtenFor { kind value level }
      publishedAt passes topics steps minutes`;

/** Other learners' public lessons for the viewer's goal (`first`: 1 to 93), and how many there are. */
export const PracticeLessonsDocument = doc<{ practiceLessons: PracticeLessons }, { first: number }>(
  `query PracticeLessons($first: Int) {
  practiceLessons(first: $first) {
    items { ${PRACTICE_LESSON} }
    total
  }
}`,
);

/**
 * The issues for the viewer's goal, each with its masked form (`first`: 0 to 100; 0 answers the total alone and reveals
 * nothing), why there are none, and whether they have room to start one.
 */
export const LearnIssuesMaskedDocument = doc<{ learnIssues: LearnIssuesAnswer }, { first: number }>(
  `query LearnIssuesMasked($first: Int) {
  learnIssues(first: $first) {
    goal { kind value level }
    items { ${LEARN_ISSUE} ${MASKED_PART} }
    total empty capReached
    room { limit value }
  }
}`,
);

/**
 * A language's day list for visitors, asked without a viewer: a short list, the same for every visitor that day, each
 * issue with its masked form. Null while Learn is not open to everyone, or for a language Learn finds no issues for.
 */
export const LearnPublicIssuesMaskedDocument = doc<
  { learnPublicIssues: LearnPublicIssuesAnswer | null },
  { language: string }
>(
  `query LearnPublicIssuesMasked($language: String!) {
  learnPublicIssues(language: $language) {
    language
    items { ${LEARN_PUBLIC_ISSUE} ${MASKED_PART} }
    total
  }
}`,
);

/** Public practice lessons for a language (`first`: 1 to 30), asked without a viewer; null on the same conditions. */
export const LearnPublicPracticeDocument = doc<
  { learnPublicPractice: PracticeLessons | null },
  { language: string; first: number }
>(
  `query LearnPublicPractice($language: String!, $first: Int) {
  learnPublicPractice(language: $language, first: $first) {
    items { ${PRACTICE_LESSON} }
    total
  }
}`,
);

const MY_LEARN_ATTEMPT = `attemptId stage state repo issueNumber issueUrl title
  latestEvent { state detail at }
  prUrl prOpenedAt prState resultUrl lessonMinutes`;

/** The viewer's Learn attempt in progress, and their newest one's pull request opened in the last 14 days. */
export const MyLearnAttemptsDocument = doc<{ myLearnAttempts: MyLearnAttempts }>(
  `query MyLearnAttempts {
  myLearnAttempts {
    current { ${MY_LEARN_ATTEMPT} }
    lastPullRequest { ${MY_LEARN_ATTEMPT} }
  }
}`,
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

/** Whether a shared lesson is there, and its stub when it is closed: the proxy's check before the page. */
export const LessonPageGateDocument = doc<
  { lessonPage: { __typename: 'LessonPage' } | LessonStub | null },
  { slug: string }
>(`query LessonPageGate($slug: String!) {
  lessonPage(slug: $slug) {
    __typename
    ... on LessonStub { visibility }
  }
}`);

/** Whether a login's result is there, under which login and slug, and the stub when closed: the proxy's check. */
export const LessonResultGateDocument = doc<
  { lessonResult: { __typename: 'LessonResultPage'; login: string; head: { slug: string } } | LessonStub | null },
  { slug: string; login: string }
>(`query LessonResultGate($slug: String!, $login: String!) {
  lessonResult(slug: $slug, login: $login) {
    __typename
    ... on LessonResultPage { login head { slug } }
    ... on LessonStub { visibility }
  }
}`);

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

/**
 * Whether to suggest Learn to the signed-in viewer here, each issue with its masked form, read with `learnOpen` so the
 * suggestion shows only to someone Learn is open to. `login`: the profile, which must be the viewer's own.
 */
export const LearnPromoMaskedDocument = doc<
  { learnOpen: boolean; learnPromo: LearnPromo | null },
  { placement: LearnPromoPlacement; login: string | null }
>(`query LearnPromoMasked($placement: LearnPromoPlacement!, $login: String) {
  learnOpen
  learnPromo(placement: $placement, login: $login) {
    show reason language issues { title repo number language topic ${MASKED_PART} }
  }
}`);

/** "Not for me": the viewer's Learn suggestions stay hidden from then on. */
export const DismissLearnPromoDocument = doc<{ dismissLearnPromo: boolean }>(
  'mutation DismissLearnPromo { dismissLearnPromo }',
);

/** A login's public Learn record, the same for every reader; null without a public pass. */
export const LearnRecordDocument = doc<{ learnRecord: LearnRecord | null }, { login: string }>(
  'query LearnRecord($login: String!) { learnRecord(login: $login) { login lessons newThings topics prsOpened prsMerged reposHelped } }',
);

/** Every public lesson whose page is open, newest published first: anonymous, for the sitemaps and llms.txt. */
export const PublicLessonsDocument = doc<{ publicLessons: PublicLesson[] }>(
  'query PublicLessons { publicLessons { slug title language repo publishedAt modifiedAt } }',
);
