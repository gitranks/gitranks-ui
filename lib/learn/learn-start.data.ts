import 'server-only';

import {
  LearnStartAttemptDocument,
  LearnStartCurrentDocument,
  LearnStartIssueDocument,
  LearnStartRoomDocument,
} from './learn-start.documents';
import type { LearnStartAttempt, LearnStartView } from './learn-start.types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type { RequestSource } from '@/lib/signed-fetch';
import { ContributeOnboardingDocument } from '@/lib/workspace/contribute.documents';
import { type ContributeActionResult, contributeErrorOf } from '@/lib/workspace/errors';

type Reader = { source: RequestSource; githubLogin: string };

/**
 * The start page's answer for an issue, as `githubLogin`: whether it can be started, and what the refusal links
 * (`OWN_IN_PROGRESS`: the lesson in progress) or counts (`LIMIT_REACHED` on open pull requests), read only then. A
 * failed read of those leaves them null; a failed `learnStartIssue` is the error.
 */
export async function learnStartViewOf(
  reader: Reader,
  repo: string,
  number: number,
): Promise<ContributeActionResult<LearnStartView>> {
  let start: LearnStartView['start'];
  try {
    ({ learnStartIssue: start } = await graphqlDirect(LearnStartIssueDocument, { repo, number }, reader));
  } catch (failure) {
    return { ok: false, ...contributeErrorOf(failure) };
  }
  const [current, openPrs] = await Promise.all([
    start.refusal === 'OWN_IN_PROGRESS'
      ? graphqlDirect(LearnStartCurrentDocument, undefined, reader)
          .then((data) => data.myLearnAttempts?.current ?? null)
          .catch(() => null)
      : null,
    start.refusal === 'LIMIT_REACHED' && start.limit === 'open_prs_at_a_time'
      ? graphqlDirect(LearnStartRoomDocument, undefined, reader)
          .then(({ learnIssues }) =>
            learnIssues?.room?.limit === 'open_prs_at_a_time' && learnIssues.room.value > 0
              ? learnIssues.room.value
              : null,
          )
          .catch(() => null)
      : null,
  ]);
  return { ok: true, data: { start, current, openPrs } };
}

/** The viewer's newest live attempt on the issue, as `githubLogin`; null while there is none. */
export async function learnStartAttemptOf(
  reader: Reader,
  repo: string,
  number: number,
): Promise<ContributeActionResult<LearnStartAttempt | null>> {
  try {
    const { learnStartAttempt } = await graphqlDirect(LearnStartAttemptDocument, { repo, number }, reader);
    return { ok: true, data: learnStartAttempt ?? null };
  } catch (failure) {
    return { ok: false, ...contributeErrorOf(failure) };
  }
}

/**
 * Whether the viewer was onboarded before this page: their agent's first call is then a token's first use, not the
 * onboarding stamp. Unanswered, taken as onboarded, so a stamp from before can never read as the agent calling now.
 */
export async function learnStartOnboarded(reader: Reader): Promise<boolean> {
  try {
    const data = await graphqlDirect(ContributeOnboardingDocument, undefined, reader);
    const contributor = data?.contribute?.contributor;
    return contributor ? !!contributor.onboardedAt : true;
  } catch {
    return true;
  }
}
