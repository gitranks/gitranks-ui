import 'server-only';

import { type BuildActionResult, buildErrorOf, invalidBuildAction } from './build-action';
import { isBuildId } from './build-ids';
import { isBuildProjectSlug } from './paths';
import { AnswerBuildTestDocument, BuildTestDocument, StartBuildTestDocument } from './test.documents';
import {
  type BuildLanguage,
  type BuildTest,
  type BuildTestAnswer,
  type BuildTestKind,
  type BuildTestRun,
  isBuildLanguage,
  isBuildTestKind,
} from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * A test of the person's build of a project: reading it (which writes nothing, so a prefetch starts nothing), starting
 * a run and answering a question. Every one is the session's person's own, never one named in the arguments.
 */

/** Which test is asked about: a project, a kind, and the build's language when the person has two builds of it. */
export type BuildTestOf = { project: string; kind: BuildTestKind; language: BuildLanguage | null };

/** The test asked about, as the browser sends it; null when it is not of the shape. */
export function buildTestOf(input: { project?: unknown; kind?: unknown; language?: unknown }): BuildTestOf | null {
  const { project, kind, language } = input ?? {};
  if (typeof project !== 'string' || !isBuildProjectSlug(project) || !isBuildTestKind(kind)) return null;
  if (language !== null && language !== undefined && !isBuildLanguage(language)) return null;
  return { project, kind, language: language ?? null };
}

/** The person's test: null when Build is not open to them, there is no build of the project, or on any failure. */
export async function loadBuildTest(githubLogin: string, test: BuildTestOf): Promise<BuildTest | null> {
  try {
    const { buildTest } = await graphqlDirect(BuildTestDocument, test, { source: 'ssr', githubLogin });
    return buildTest ?? null;
  } catch {
    return null;
  }
}

/** Starts a run ("Take the test", "Take the test again"), or answers the open one as it is. */
export async function startBuildTest(
  githubLogin: string,
  input: { project?: unknown; kind?: unknown; language?: unknown },
): Promise<BuildActionResult<BuildTestRun | null>> {
  const test = buildTestOf(input);
  if (!test) return invalidBuildAction();
  try {
    const { startBuildTest: run } = await graphqlDirect(StartBuildTestDocument, test, {
      source: 'client',
      githubLogin,
    });
    return { ok: true, data: run ?? null };
  } catch (error) {
    return { ok: false, error: buildErrorOf(error) };
  }
}

/** An option's place in the run's order (a question has three or four), or null for "I don't know". */
const isPick = (pick: unknown): pick is number | null =>
  pick === null || (typeof pick === 'number' && Number.isInteger(pick) && pick >= 0 && pick < 4);

/** One answer of a run; the tenth brings the result. No verdict comes back before it. */
export async function answerBuildTest(
  githubLogin: string,
  input: { run?: unknown; question?: unknown; pick?: unknown },
): Promise<BuildActionResult<BuildTestAnswer | null>> {
  const { run, question, pick } = input ?? {};
  if (!isBuildId(run) || !isBuildId(question) || !isPick(pick)) return invalidBuildAction();
  try {
    const { answerBuildTest: answer } = await graphqlDirect(
      AnswerBuildTestDocument,
      { run, question, pick },
      { source: 'client', githubLogin },
    );
    return { ok: true, data: answer ?? null };
  } catch (error) {
    return { ok: false, error: buildErrorOf(error) };
  }
}
