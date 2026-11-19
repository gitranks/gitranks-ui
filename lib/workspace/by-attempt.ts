import type { Route } from 'next';

import type { ContributeAttempt, ContributeAttemptMode } from './contribute.types';
import { pullRequestPath } from './paths';

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

/** The query's text, without `view` (the address by attempt's own word), as it was asked, after `extra`. */
function queryOf(search: URLSearchParams, extra: Record<string, string> = {}): string {
  const kept = new URLSearchParams(search);
  kept.delete('view');
  for (const [key, value] of Object.entries(extra)) kept.set(key, value);
  const text = kept.toString();
  return text ? `?${text}` : '';
}

/**
 * Where `/my/pull-requests/by-attempt/<id>` sends the browser, with the whole query but `view` kept (GitHub's consent
 * comes back with `?resume=`, a row may name `?move=`, an agent `?session=next`). Null when the attempt has no page
 * (its repo or its first attempt is not known, or the issue has no attempt of the viewer's): the route answers 404.
 * - a follow-up run: its session, `…/runs/<id>`, under its first attempt's page;
 * - a Fix first attempt: the pull request's page by repo and issue;
 * - a Learn first attempt: the view its lesson's stage names (`learnView`, W1 §8.3: the Lesson view `…/lesson` until
 *   its pull request opens, then the Pull request view); `?view=lesson` always asks for the lesson, and the pull
 *   request's next step (`?session=next`) or a move (`?move=`) for the Pull request view's next step. With no lesson
 *   view (Learn closed to the viewer), the Pull request view.
 * A first attempt that is not the issue's newest opens at `…/earlier/<id>`.
 */
export function byAttemptTargetOf(
  attempt: ByAttemptRead,
  issue: IssueAttemptRef | null,
  search: URLSearchParams,
  learnView: 'pr' | 'lesson' | null = null,
): Route | null {
  const followUp = attempt.kind === 'FOLLOW_UP';
  const firstId = followUp ? attempt.followUpOf?.attemptId : attempt.attemptId;
  if (!firstId || !issue) return null;
  const ref = { repo: issue.repo, issue: issue.number, earlier: firstId === issue.attemptId ? null : firstId };
  const to = (path: Route, extra?: Record<string, string>) => `${path}${queryOf(search, extra)}` as Route;
  if (followUp) return to(pullRequestPath(ref, { run: attempt.attemptId }));
  if (attempt.mode !== 'LEARN') return to(pullRequestPath(ref));
  if (!learnView) return to(pullRequestPath(ref));
  if (search.get('view') === 'lesson') return to(`${pullRequestPath(ref)}/lesson` as Route);
  // A move shows on the Pull request view's next step.
  if (search.get('session') === 'next' || search.has('move')) return to(pullRequestPath(ref), { session: 'next' });
  return to(learnView === 'lesson' ? (`${pullRequestPath(ref)}/lesson` as Route) : pullRequestPath(ref));
}
