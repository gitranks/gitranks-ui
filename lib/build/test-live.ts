import type { BuildActionError, BuildActionResult } from './build-action';
import {
  BUILD_TEST_ANSWER_MINE_PATH,
  BUILD_TEST_START_MINE_PATH,
  buildProjectMinePath,
  buildTestMinePath,
} from './paths';
import type { BuildTestRunShown, BuildTestShown } from './test';
import type { BuildLanguage, BuildProjectMine, BuildTestAnswer, BuildTestKind } from './types';
import type { LearnQuestion } from '@/lib/workspace/learn-question';

/*
 * What the test's page asks from the browser: the test (which writes nothing), the person's side of the project, a
 * new run, and one answer. Each read is null on any failure; each write says why it was not taken.
 */

const isRun = (run: unknown): run is BuildTestRunShown =>
  !!run &&
  typeof (run as BuildTestRunShown).run === 'string' &&
  Array.isArray((run as BuildTestRunShown).questions) &&
  typeof (run as BuildTestRunShown).answered === 'number';

/**
 * A question of an open run with no key: an option keeps only its text. The API sends none before the end; this keeps
 * the rule on this side too, whatever it sends.
 */
function keylessOf(question: LearnQuestion): LearnQuestion {
  const content = question.content as { options?: unknown } | null;
  if (!content || typeof content !== 'object' || !Array.isArray(content.options)) return question;
  const options = content.options.map((option: unknown) =>
    option && typeof option === 'object' ? { text: (option as { text?: unknown }).text } : option,
  );
  return { ...question, content: { ...content, options } };
}

/** An open run, every question without its key. */
export const keylessRunOf = <T extends BuildTestRunShown>(run: T): T => ({
  ...run,
  questions: run.questions.map(keylessOf),
});

/** The person's test of the project: null when there is none for them, and on any failure. */
export async function readBuildTest(
  project: string,
  kind: BuildTestKind,
  language: BuildLanguage | null,
): Promise<BuildTestShown | null> {
  try {
    const res = await fetch(buildTestMinePath(project, kind, language), { cache: 'no-store' });
    if (!res.ok) return null;
    const { test } = (await res.json()) as { test?: BuildTestShown | null };
    if (!test || test.kind !== kind || (test.open !== null && !isRun(test.open))) return null;
    return test.open ? { ...test, open: keylessRunOf(test.open) } : test;
  } catch {
    return null;
  }
}

/** The person's side of the project (their builds of it): null on any failure. */
export async function readBuildProjectMine(project: string): Promise<BuildProjectMine | null> {
  try {
    const res = await fetch(buildProjectMinePath(project), { cache: 'no-store' });
    if (!res.ok) return null;
    const { mine } = (await res.json()) as { mine?: BuildProjectMine | null };
    return mine && Array.isArray(mine.builds) ? mine : null;
  } catch {
    return null;
  }
}

const ERRORS: readonly BuildActionError[] = ['SIGNED_OUT', 'CONFLICT', 'NOT_FOUND', 'INVALID', 'FAILED'];

/** A write from the browser: the route's `{ ok, data }`, or why it was not taken (`FAILED` when it never answered). */
async function post<T>(path: string, body: unknown): Promise<BuildActionResult<T>> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const answer = (await res.json().catch(() => null)) as BuildActionResult<T> | null;
    if (answer?.ok === true) return answer;
    const error = answer && answer.ok === false && ERRORS.includes(answer.error) ? answer.error : 'FAILED';
    return { ok: false, error };
  } catch {
    return { ok: false, error: 'FAILED' };
  }
}

/** Starts a run of the test, or gets the open one as it is. */
export async function startBuildTestRun(
  project: string,
  kind: BuildTestKind,
  language: BuildLanguage | null,
): Promise<BuildActionResult<BuildTestRunShown>> {
  const started = await post<BuildTestRunShown | null>(BUILD_TEST_START_MINE_PATH, { project, kind, language });
  if (!started.ok) return started;
  return isRun(started.data) ? { ok: true, data: keylessRunOf(started.data) } : { ok: false, error: 'FAILED' };
}

/** One answer: the option's place in the run's order, or null for "I don't know". The tenth brings the result. */
export async function answerBuildTestRun(
  run: string,
  question: string,
  pick: number | null,
): Promise<BuildActionResult<BuildTestAnswer>> {
  const answered = await post<BuildTestAnswer | null>(BUILD_TEST_ANSWER_MINE_PATH, { run, question, pick });
  if (!answered.ok) return answered;
  return answered.data ? { ok: true, data: answered.data } : { ok: false, error: 'FAILED' };
}
