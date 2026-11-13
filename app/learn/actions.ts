'use server';

import { signIn } from '@/auth';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { viewerLogin } from '@/lib/contribute/contribute.data';
import {
  type ContributeActionResult,
  contributeErrorOf,
  type PrFeedbackErrorCode,
  prFeedbackErrorOf,
} from '@/lib/contribute/errors';
import { currentMaintainerToken, markMaintainerSignIn } from '@/lib/contribute/maintainer-token';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import {
  AnswerLessonQuestionDocument,
  AnswerWarmupDocument,
  LogCopyForAgentDocument,
  MarkStepShownDocument,
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
  LearnProfile,
  LessonAnswerResult,
  LessonReaction,
  LessonReportReason,
  LessonResultReaction,
  LessonRun,
  LessonWarmupAnswer,
} from '@/lib/learn/learn.types';
import { githubLoginOf, lessonResultPath, lessonSlugOf, REACT_PARAM } from '@/lib/learn/learn-path';
import { cleanProfileInput } from '@/lib/learn/profile-form';
import { REPORT_REASONS } from '@/lib/learn/question';
import { markReaction, takeReactionMark } from '@/lib/learn/react-mark';
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
  const returnTo =
    marked && slug && login && reaction
      ? `${lessonResultPath(slug, login)}?${REACT_PARAM}=${reaction.toLowerCase()}`
      : undefined;
  await signIn(IDENTITY_PROVIDER, { redirectTo: await markMaintainerSignIn(returnTo) });
}
