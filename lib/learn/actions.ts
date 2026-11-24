'use server';

import { signIn } from '@/auth';
import { currentMaintainerToken, markMaintainerSignIn } from '@/lib/auth/light-sign-in';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import {
  AnswerLessonQuestionDocument,
  AnswerWarmupDocument,
  DismissLearnPromoDocument,
  LearnIssuesMaskedDocument,
  LogCopyForAgentDocument,
  MarkStepShownDocument,
  MyLearnAttemptsDocument,
  PracticeLessonsDocument,
  RateLessonDocument,
  ReactToResultDocument,
  RemoveLessonDocument,
  ReportQuestionDocument,
  SaveLearnProfileDocument,
  SendQuestionFeedbackDocument,
  ShareMyResultDocument,
  StartLessonRunDocument,
  StartSharedLessonRunDocument,
} from '@/lib/learn/learn.documents';
import type {
  LearnIssues,
  LearnProfile,
  LessonAnswerResult,
  LessonReaction,
  LessonReportReason,
  LessonResultReaction,
  LessonRun,
  LessonWarmupAnswer,
  MyLearnAttempts,
  PracticeLessons,
  PracticeNext,
} from '@/lib/learn/learn.types';
import { currentOf } from '@/lib/learn/learn-home';
import { githubLoginOf, LEARN_MAINTAINERS_PATH, lessonResultPath, lessonSlugOf } from '@/lib/learn/learn-path';
import { LEARN_ISSUES_MAX, PRACTICE_MAX } from '@/lib/learn/learn-tab';
import { learnIssuesOf } from '@/lib/learn/masked-rows';
import { cleanProfileInput } from '@/lib/learn/profile-form';
import { REPORT_REASONS } from '@/lib/learn/question';
import { markReaction, takeReactionMark } from '@/lib/learn/react-mark';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import {
  type ContributeActionResult,
  contributeErrorOf,
  type PrFeedbackErrorCode,
  prFeedbackErrorOf,
} from '@/lib/workspace/errors';
import { REACT_PARAM } from '@/lib/workspace/paths';
import { attemptIdOf } from '@/lib/workspace/pr-feedback';
import type DocumentNode from '@/types/typed-document-node';

/** Ids as the API takes them: short strings, never anything else from the browser. */
const ID_MAX = 200;
const idOf = (value: unknown) => {
  const id = typeof value === 'string' ? value.trim() : '';
  return id && id.length <= ID_MAX ? id : null;
};
const idsOf = (value: unknown) =>
  Array.isArray(value) && value.length <= 20 ? value.map(idOf).filter((id): id is string => !!id) : null;

const invalid = <T>(): ContributeActionResult<T> => ({
  ok: false,
  error: 'INVALID',
  message: 'That was not accepted.',
});

/** Every action runs as the session's user, never one named in its arguments. */
async function run<TData, TVariables extends Record<string, unknown>, T>(
  document: DocumentNode<TData, TVariables>,
  variables: TVariables,
  pick: (data: TData) => T,
): Promise<ContributeActionResult<T>> {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const data = await graphqlDirect(document, variables, { source: 'client', githubLogin });
    return { ok: true, data: pick(data) };
  } catch (error) {
    return { ok: false, ...contributeErrorOf(error) };
  }
}

/** Opens the viewer's run of their Learn attempt's lesson: the open one when there is one, else a new one. */
export async function startLessonRun(attemptId: string): Promise<ContributeActionResult<LessonRun>> {
  const id = idOf(attemptId);
  if (!id) return invalid();
  return run(StartLessonRunDocument, { attemptId: id }, (data) => data.startLessonRun);
}

/** The warm-up's answers, all at once: a right one passes its step in advance. */
export async function answerWarmup(
  runId: string,
  answers: LessonWarmupAnswer[],
): Promise<ContributeActionResult<LessonRun>> {
  const id = idOf(runId);
  if (!id || !Array.isArray(answers) || answers.length > 20) return invalid();
  const clean: LessonWarmupAnswer[] = [];
  for (const answer of answers) {
    const questionId = idOf(answer?.questionId);
    const picked = idsOf(answer?.picked);
    if (!questionId || !picked) return invalid();
    clean.push({ questionId, picked, dontKnow: answer.dontKnow === true });
  }
  return run(AnswerWarmupDocument, { runId: id, answers: clean }, (data) => data.answerWarmup);
}

/** Tells the API a step is on screen: the time to its answer is counted from here. */
export async function markStepShown(runId: string, stepId: string): Promise<ContributeActionResult<boolean>> {
  const id = idOf(runId);
  const step = idOf(stepId);
  if (!id || !step) return invalid();
  return run(MarkStepShownDocument, { runId: id, stepId: step }, (data) => data.markStepShown);
}

/** Checks an answer: graded by the API, which alone knows the key. */
export async function answerLessonQuestion(
  runId: string,
  questionId: string,
  picked: string[],
): Promise<ContributeActionResult<LessonAnswerResult>> {
  const id = idOf(runId);
  const question = idOf(questionId);
  const ids = idsOf(picked);
  if (!id || !question || !ids?.length) return invalid();
  return run(
    AnswerLessonQuestionDocument,
    { runId: id, questionId: question, picked: ids },
    (data) => data.answerLessonQuestion,
  );
}

/** A like or a dislike on a question; a new one replaces the last. */
export async function sendQuestionFeedback(
  runId: string,
  questionId: string,
  liked: boolean,
): Promise<ContributeActionResult<boolean>> {
  const id = idOf(runId);
  const question = idOf(questionId);
  if (!id || !question || typeof liked !== 'boolean') return invalid();
  return run(
    SendQuestionFeedbackDocument,
    { runId: id, questionId: question, liked },
    (data) => data.sendQuestionFeedback,
  );
}

/** Reports a question: it is dropped for this user, and the step asks its other one. */
export async function reportQuestion(
  runId: string,
  questionId: string,
  reason: LessonReportReason,
): Promise<ContributeActionResult<LessonRun>> {
  const id = idOf(runId);
  const question = idOf(questionId);
  if (!id || !question || !REPORT_REASONS.some((item) => item.value === reason)) return invalid();
  return run(ReportQuestionDocument, { runId: id, questionId: question, reason }, (data) => data.reportQuestion);
}

/** Notes that the user copied a step for their own agent. */
export async function logCopyForAgent(runId: string, stepId: string): Promise<ContributeActionResult<boolean>> {
  const id = idOf(runId);
  const step = idOf(stepId);
  if (!id || !step) return invalid();
  return run(LogCopyForAgentDocument, { runId: id, stepId: step }, (data) => data.logCopyForAgent);
}

/** "Was this lesson worth your time?" */
export async function rateLesson(runId: string, worthIt: boolean): Promise<ContributeActionResult<boolean>> {
  const id = idOf(runId);
  if (!id || typeof worthIt !== 'boolean') return invalid();
  return run(RateLessonDocument, { runId: id, worthIt }, (data) => data.rateLesson);
}

/** Takes the author's public lesson down, for good: both its links then say so. */
export async function removeLesson(slug: string): Promise<ContributeActionResult<boolean>> {
  const id = idOf(slug);
  if (!id) return invalid();
  return run(RemoveLessonDocument, { slug: id }, (data) => data.removeLesson);
}

/** Saves the viewer's goal, levels and focus; the next lesson is written for them. */
export async function saveLearnProfile(input: unknown): Promise<ContributeActionResult<LearnProfile>> {
  const clean = cleanProfileInput(input);
  if (!clean) return invalid();
  return run(SaveLearnProfileDocument, { input: clean }, (data) => data.saveLearnProfile);
}

/** Opens the viewer's run of a shared lesson: the open one when there is one, else a new one. */
export async function startSharedLessonRun(slug: string): Promise<ContributeActionResult<LessonRun>> {
  const id = lessonSlugOf(slug);
  if (!id) return invalid();
  return run(StartSharedLessonRunDocument, { slug: id }, (data) => data.startLessonRun);
}

/** "Share my result": the viewer's passed run of a shared lesson shows on their result page, or stops showing. */
export async function shareMyResult(runId: string, share: boolean): Promise<ContributeActionResult<LessonRun>> {
  const id = idOf(runId);
  if (!id || typeof share !== 'boolean') return invalid();
  return run(ShareMyResultDocument, { runId: id, share }, (data) => data.shareMyResult);
}

/** A reaction stored, with the result page's reactions after it, or why not. The GitHub token never comes back. */
export type ReactionResult = { ok: true; data: LessonResultReaction[] } | { ok: false; error: PrFeedbackErrorCode };

const reactionOf = (value: unknown): LessonReaction | null => (value === 'YES' || value === 'NO' ? value : null);

async function react(slug: string, login: string, reaction: LessonReaction): Promise<ReactionResult> {
  const token = await currentMaintainerToken();
  if (!token) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const { reactToResult } = await graphqlDirect(
      ReactToResultDocument,
      { slug, login, reaction, token },
      { source: 'client' },
    );
    return { ok: true, data: reactToResult };
  } catch (failure) {
    return { ok: false, error: prFeedbackErrorOf(failure) };
  }
}

/**
 * "Did this help you review the pull request?": stores the answer with the visitor's GitHub account, from the light
 * sign-in's token, read here from the session. A new answer replaces the last.
 */
export async function reactToLessonResult(
  slug: string,
  login: string,
  reaction: LessonReaction,
): Promise<ReactionResult> {
  const id = lessonSlugOf(slug);
  const githubLogin = githubLoginOf(login);
  const pick = reactionOf(reaction);
  if (!id || !githubLogin || !pick) return { ok: false, error: 'INVALID' };
  return react(id, githubLogin, pick);
}

/**
 * The answer picked before the sign-in, stored on the way back: only when this browser started that sign-in for this
 * result page and this pick (`takeReactionMark`), so a link carrying `?react=` stores nothing by itself.
 */
export async function reactOnReturn(slug: string, login: string, reaction: LessonReaction): Promise<ReactionResult> {
  const id = lessonSlugOf(slug);
  const githubLogin = githubLoginOf(login);
  const pick = reactionOf(reaction);
  if (!id || !githubLogin || !pick) return { ok: false, error: 'INVALID' };
  if (!(await takeReactionMark(id, githubLogin, pick))) return { ok: false, error: 'INVALID' };
  return react(id, githubLogin, pick);
}

/**
 * The light GitHub sign-in for a reaction picked while signed out: back to the result page with the pick in its
 * address (`?react=yes|no`), stored on return with no second click.
 */
export async function signInToReact(form: FormData): Promise<void> {
  const slug = lessonSlugOf(form.get('slug'));
  const login = githubLoginOf(form.get('login'));
  const reaction = reactionOf(form.get('reaction'));
  const marked = slug && login && reaction ? await markReaction(slug, login, reaction) : false;
  // From the Learn maintainers page (`from`: the pull request's footer link), back to it; else to the result page.
  const from = attemptIdOf(form.get('from'));
  const back = from
    ? `${LEARN_MAINTAINERS_PATH}?${new URLSearchParams({ from })}&`
    : slug && login
      ? `${lessonResultPath(slug, login)}?`
      : '';
  const returnTo = marked && reaction && back ? `${back}${REACT_PARAM}=${reaction.toLowerCase()}` : undefined;
  await signIn(IDENTITY_PROVIDER, { redirectTo: await markMaintainerSignIn(returnTo) });
}

/** "Not for me": the viewer's Learn suggestions stay hidden, on the home page and their profile, from then on. */
export async function dismissLearnPromo(): Promise<ContributeActionResult<boolean>> {
  return run(DismissLearnPromoDocument, {}, (data) => data.dismissLearnPromo);
}

/** How many of a list the browser may ask for: a whole number from `min` to `max`, else null. */
const countOf = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : null;

/** The viewer's Learn attempt in progress and their newest pull request, read again for a passed practice lesson's next step. */
export async function readMyLearnAttempts(): Promise<ContributeActionResult<MyLearnAttempts>> {
  return run(MyLearnAttemptsDocument, {}, (data) => data.myLearnAttempts);
}

/** Other learners' lessons for the viewer's goal: "Show 10 more" reads up to 93 in place. */
export async function readPracticeLessons(first: number): Promise<ContributeActionResult<PracticeLessons>> {
  const count = countOf(first, 1, PRACTICE_MAX);
  if (count === null) return invalid();
  return run(PracticeLessonsDocument, { first: count }, (data) => data.practiceLessons);
}

/**
 * The issues for the viewer's goal: "Show 10 more" reads the list again with a larger `first`, up to 100. Rows already
 * shown cost no new reveal.
 */
export async function readLearnIssues(first: number): Promise<ContributeActionResult<LearnIssues>> {
  const count = countOf(first, 1, LEARN_ISSUES_MAX);
  if (count === null) return invalid();
  return readIssuesFor(count);
}

/**
 * The issues for the viewer's goal, with each one's masked form. A masked row leaves the read stripped of what names its
 * issue, keyed by its mask id.
 */
const readIssuesFor = (first: number) =>
  run(LearnIssuesMaskedDocument, { first }, (data) => learnIssuesOf(data.learnIssues));

/** How many issues a passed practice lesson shows. */
const PASSED_ISSUES = 2;

/**
 * What a passed practice lesson offers next: the viewer's own lesson in progress when there is one (no issue is read
 * then, so none is revealed), else the first two issues for their goal.
 */
export async function readPracticeNext(): Promise<ContributeActionResult<PracticeNext>> {
  const attempts = await readMyLearnAttempts();
  if (!attempts.ok) return attempts;
  const current = currentOf(attempts.data);
  if (current) return { ok: true, data: { current, issues: null } };
  const issues = await readIssuesFor(PASSED_ISSUES);
  return issues.ok ? { ok: true, data: { current: null, issues: issues.data } } : issues;
}
