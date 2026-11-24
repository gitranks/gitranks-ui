import type { Route } from 'next';

import type { ContributeAttempt, ContributeAttemptMode } from './contribute.types';
import { RESUME_PARAM } from './grant-resume';
import { pullRequestApprovePath, pullRequestPath, pullRequestWalkthroughPath } from './paths';

/** What the address by attempt needs to know of the attempt it names: its issue, its kind and side, its first. */
export type ByAttemptRead = Pick<ContributeAttempt, 'attemptId' | 'kind' | 'mode' | 'nameWithOwner' | 'number'> & {
  followUpOf: { attemptId: string } | null;
  /** Its pull request, once there is one. */
  pullRequest?: { prId: string } | null;
};

/**
 * The viewer's newest first attempt on an issue (follow-ups left out), as the API answers it: its id and side, the
 * repo's current name (a rename, or another letter case, differs from the address) and the older first attempts.
 */
export type IssueAttemptRef = {
  attemptId: string;
  mode: ContributeAttemptMode;
  repo: string;
  number: number;
  earlier: string[] | null;
};

/** The query's text, without `view` (the address by attempt's own word), as it was asked. */
function queryOf(search: URLSearchParams): string {
  const kept = new URLSearchParams(search);
  kept.delete('view');
  const text = kept.toString();
  return text ? `?${text}` : '';
}

/**
 * Where `/my/pull-requests/by-attempt/<id>` sends the browser, with the whole query but `view` kept (GitHub's consent
 * comes back with `?resume=`). Null when the attempt has no page (its repo or its first attempt is not known, or the
 * issue has no attempt of the viewer's): the route answers 404.
 * - a follow-up run: its address, `…/runs/<id>`, which opens its first attempt's page at its round;
 * - back from GitHub's access screen (`?resume=`): Approve, which sends what the person approved;
 * - `?view=lesson` (the needs-you emails' link to a Learn fix's lesson, and older links): the fixer's walkthrough;
 * - anything else: the pull request's page by repo and issue.
 * A first attempt that is not the issue's newest opens at `…/earlier/<id>`, its walkthrough and Approve read there.
 */
export function byAttemptTargetOf(
  attempt: ByAttemptRead,
  issue: IssueAttemptRef | null,
  search: URLSearchParams,
): Route | null {
  const followUp = attempt.kind === 'FOLLOW_UP';
  const firstId = followUp ? attempt.followUpOf?.attemptId : attempt.attemptId;
  if (!firstId || !issue) return null;
  const ref = { repo: issue.repo, issue: issue.number, earlier: firstId === issue.attemptId ? null : firstId };
  const to = (path: Route) => `${path}${queryOf(search)}` as Route;
  if (followUp) return to(pullRequestPath(ref, { run: attempt.attemptId }));
  if (ref.earlier) return to(pullRequestPath(ref));
  if (search.has(RESUME_PARAM)) return to(pullRequestApprovePath(ref));
  if (attempt.mode === 'LEARN' && search.get('view') === 'lesson') return to(pullRequestWalkthroughPath(ref));
  return to(pullRequestPath(ref));
}
