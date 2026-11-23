'use server';

import {
  type CheckAnswerInput,
  checkAnswerInputOf,
  knownSaveInputOf,
  type LearnCheck,
  type LearnKnownSaved,
} from './check';
import { AnswerLearnCheckDocument, SaveLearnKnownDocument, StopLearnCheckDocument } from './check.documents';
import { invalidAnswer, type LearnActionResult, learnErrorOf } from './learn-action';
import { isContentSlug } from './paths';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { viewerLogin } from '@/lib/workspace/contribute.data';

/*
 * The check's writes, each as the session's user and never one named in the arguments. Null data when Learn is not
 * open to the person; `CONFLICT` for a group answered already or a run that ended; `NOT_FOUND` when the course offers
 * no check.
 */

const variablesOf = ({ course, group, picked, dontKnow, language }: CheckAnswerInput) =>
  dontKnow ? { course, group, dontKnow: true, language } : { course, group, picked, language };

/** One answer of the check: a pick, or "I don't know". No verdict comes back. */
export async function answerLearnCheckAction(input: {
  course: string;
  group: string;
  picked: unknown;
  dontKnow: boolean;
  language: string | null;
}): Promise<LearnActionResult<boolean | null>> {
  const answer = checkAnswerInputOf(input ?? {});
  if (!answer) return invalidAnswer();
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const data = await graphqlDirect(AnswerLearnCheckDocument, variablesOf(answer), { source: 'client', githubLogin });
    return { ok: true, data: data.answerLearnCheck ?? null };
  } catch (error) {
    return { ok: false, error: learnErrorOf(error) };
  }
}

/** "Stop and see the result": ends the run; its result comes back with it. */
export async function stopLearnCheckAction(course: string): Promise<LearnActionResult<LearnCheck | null>> {
  if (typeof course !== 'string' || !isContentSlug(course)) return invalidAnswer();
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const data = await graphqlDirect(StopLearnCheckDocument, { course }, { source: 'client', githubLogin });
    return { ok: true, data: data.stopLearnCheck ?? null };
  } catch (error) {
    return { ok: false, error: learnErrorOf(error) };
  }
}

/**
 * Saves the lessons of a course marked as known; every other lesson of it is unmarked. With `check`, it saves that
 * run's result; "What you know" sends none. Answers where the person starts.
 */
export async function saveLearnKnownAction(input: {
  course: string;
  known: string[];
  check: string | null;
}): Promise<LearnActionResult<LearnKnownSaved | null>> {
  const marks = knownSaveInputOf(input ?? {});
  if (!marks) return invalidAnswer();
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const data = await graphqlDirect(SaveLearnKnownDocument, marks, { source: 'client', githubLogin });
    return { ok: true, data: data.saveLearnKnown ?? null };
  } catch (error) {
    return { ok: false, error: learnErrorOf(error) };
  }
}
