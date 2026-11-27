import 'server-only';

import type { BuildActionResult } from './build-action';
import type { BuildTestRunShown, BuildTestShown } from './test';
import type { BuildTest, BuildTestRun } from './types';
import { plainCodeOf } from '@/lib/workspace/code-tokens';
import { highlightCodes } from '@/lib/workspace/highlight';

/*
 * A test's questions with their code highlighted here, before the browser gets them: the test's page is read in the
 * browser and has no server render of its own. Only a question with code gets an entry; a run with none is sent as
 * the API gave it.
 */

/** A run, each question that has code with it highlighted (plain where it cannot be). */
export async function shownRunOf(run: BuildTestRun): Promise<BuildTestRunShown> {
  const withCode = run.questions.filter((question) => question.codes?.length);
  if (!withCode.length) return run;
  const entries = await Promise.all(
    withCode.map(
      async (question) =>
        [question.id, await highlightCodes(question.codes).catch(() => question.codes.map(plainCodeOf))] as const,
    ),
  );
  return { ...run, highlighted: Object.fromEntries(entries) };
}

/** A test as read, its open run's code highlighted. */
export async function shownTestOf(test: BuildTest | null): Promise<BuildTestShown | null> {
  if (!test?.open) return test;
  return { ...test, open: await shownRunOf(test.open) };
}

/** A started run as the start answered it, its code highlighted. */
export async function shownStartOf(
  started: BuildActionResult<BuildTestRun | null>,
): Promise<BuildActionResult<BuildTestRunShown | null>> {
  if (!started.ok || !started.data) return started;
  return { ok: true, data: await shownRunOf(started.data) };
}
