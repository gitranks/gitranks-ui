import 'server-only';

import type { BuildActionResult } from './build-action';
import type { BuildTestAnswerShown, BuildTestResultShown, BuildTestRunShown, BuildTestShown } from './test';
import type { BuildTest, BuildTestAnswer, BuildTestResult, BuildTestRun } from './types';
import { type HighlightedCode, plainCodeOf } from '@/lib/workspace/code-tokens';
import { highlightCodes } from '@/lib/workspace/highlight';
import type { LearnQuestion } from '@/lib/workspace/learn-question';

/*
 * A test's questions with their code highlighted here, before the browser gets them: the test's page is read in the
 * browser and has no server render of its own. The open run's questions and a result's answers both show their code.
 * Only a question with code gets an entry; a run or a result with none is sent as the API gave it.
 */

/** Each question that has code, by its id, with that code highlighted (plain where it cannot be); null for none. */
async function highlightedOf(questions: readonly LearnQuestion[]): Promise<Record<string, HighlightedCode[]> | null> {
  const withCode = questions.filter((question) => question.codes?.length);
  if (!withCode.length) return null;
  const entries = await Promise.all(
    withCode.map(
      async (question) =>
        [question.id, await highlightCodes(question.codes).catch(() => question.codes.map(plainCodeOf))] as const,
    ),
  );
  return Object.fromEntries(entries);
}

/** A run, each question that has code with it highlighted. */
export async function shownRunOf(run: BuildTestRun): Promise<BuildTestRunShown> {
  const highlighted = await highlightedOf(run.questions);
  return highlighted ? { ...run, highlighted } : run;
}

/** A result, each answer whose question has code with it highlighted, so the result draws the code it asked about. */
export async function shownResultOf(result: BuildTestResult): Promise<BuildTestResultShown> {
  const highlighted = await highlightedOf(result.items.map((item) => item.question));
  return highlighted ? { ...result, highlighted } : result;
}

/** A test as read, the code of its open run and of its last result highlighted. */
export async function shownTestOf(test: BuildTest | null): Promise<BuildTestShown | null> {
  if (!test?.open && !test?.last) return test;
  const [open, last] = await Promise.all([
    test.open ? shownRunOf(test.open) : null,
    test.last ? shownResultOf(test.last) : null,
  ]);
  return open === test.open && last === test.last ? test : { ...test, open, last };
}

/** A started run as the start answered it, its code highlighted. */
export async function shownStartOf(
  started: BuildActionResult<BuildTestRun | null>,
): Promise<BuildActionResult<BuildTestRunShown | null>> {
  if (!started.ok || !started.data) return started;
  return { ok: true, data: await shownRunOf(started.data) };
}

/** An answer as the API gave it; with the tenth, its result's code highlighted, as the result shows it at once. */
export async function shownAnswerOf(
  answered: BuildActionResult<BuildTestAnswer | null>,
): Promise<BuildActionResult<BuildTestAnswerShown | null>> {
  if (!answered.ok || !answered.data?.result) return answered;
  return { ok: true, data: { ...answered.data, result: await shownResultOf(answered.data.result) } };
}
