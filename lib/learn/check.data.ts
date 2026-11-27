import 'server-only';

import type { CheckSide, LearnCheck } from './check';
import { LearnCheckDocument } from './check.documents';
import { learnErrorOf } from './learn-action';
import { isContentSlug } from './paths';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { plainCodeOf } from '@/lib/workspace/code-tokens';
import { highlightCodes } from '@/lib/workspace/highlight';

/*
 * The signed-in person's run of a course's check, read for them alone and never kept: its questions with their code
 * highlighted here (the page has no server render of its own), or its result once it ended.
 */

/**
 * The run: `check`, null when Learn is not open to the person or on any failure; `missing`, when the course offers no
 * check (or is not a course), so the page says so instead of asking to try again.
 */
export async function loadLearnCheckSide(
  githubLogin: string,
  course: string,
): Promise<{ check: CheckSide | null; missing: boolean }> {
  if (!isContentSlug(course)) return { check: null, missing: true };
  let check: LearnCheck | null;
  try {
    ({ learnCheck: check } = await graphqlDirect(LearnCheckDocument, { course }, { source: 'ssr', githubLogin }));
  } catch (error) {
    return { check: null, missing: learnErrorOf(error) === 'NOT_FOUND' };
  }
  if (!check) return { check: null, missing: false };
  // An ended run's questions are not drawn: only its result is.
  const questions = check.result
    ? []
    : await Promise.all(
        check.questions.map(async (asked) => ({
          ...asked,
          highlighted: await highlightCodes(asked.question.codes).catch(() => asked.question.codes.map(plainCodeOf)),
        })),
      );
  return { check: { ...check, questions }, missing: false };
}
