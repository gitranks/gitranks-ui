'use server';

import { viewerLogin } from '@/lib/contribute/contribute.data';
import { type ContributeActionResult, contributeErrorOf } from '@/lib/contribute/errors';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import {
  AnswerLessonQuestionDocument,
  AnswerWarmupDocument,
  LogCopyForAgentDocument,
  MarkStepShownDocument,
  RateLessonDocument,
  RemoveLessonDocument,
  ReportQuestionDocument,
  SendQuestionFeedbackDocument,
  StartLessonRunDocument,
} from '@/lib/learn/learn.documents';
import type { LessonAnswerResult, LessonReportReason, LessonRun, LessonWarmupAnswer } from '@/lib/learn/learn.types';
import { REPORT_REASONS } from '@/lib/learn/question';
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
