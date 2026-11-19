import type { Route } from 'next';

import type { ContributeAttempt } from './contribute.types';
import { learnAttemptPath } from './paths';
import { attemptPath, sessionPath } from './sessions';

/** What the address by attempt needs to know of the attempt it names. */
export type ByAttemptRead = Pick<ContributeAttempt, 'attemptId' | 'kind' | 'mode'> & {
  followUpOf: { attemptId: string } | null;
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
 * comes back with `?resume=`, a row may name `?move=`, an agent `?session=next`). For now the pages of today:
 * - a follow-up run: its session, under its first attempt;
 * - a Fix attempt: Contribute's attempt page;
 * - a Learn attempt: its lesson's page, unless the link asks for the pull request's next step (`?session=next`) or a
 *   move (`?move=`), which Contribute's attempt page shows on its next step only (so a move gets `session=next`);
 *   `?view=lesson` always asks for the lesson.
 * Unread (signed out, not found, the API down): Contribute's attempt page, which asks a visitor to sign in and
 * answers anyone else with what it finds.
 */
export function byAttemptTargetOf(attemptId: string, attempt: ByAttemptRead | null, search: URLSearchParams): Route {
  const query = queryOf(search);
  const to = (path: string) => `${path}${query}` as Route;
  if (!attempt) return to(attemptPath(attemptId));
  if (attempt.kind === 'FOLLOW_UP' && attempt.followUpOf) {
    return to(sessionPath(attempt.followUpOf.attemptId, attempt.attemptId));
  }
  if (attempt.mode !== 'LEARN') return to(attemptPath(attempt.attemptId));
  const lesson = search.get('view') === 'lesson';
  if (lesson || (search.get('session') !== 'next' && !search.has('move'))) {
    return to(learnAttemptPath(attempt.attemptId));
  }
  // Contribute's page shows a Learn pull request's moves only on its next step: a move asks for it.
  const next = new URLSearchParams(search);
  next.delete('view');
  next.set('session', 'next');
  return `${attemptPath(attempt.attemptId)}?${next.toString()}` as Route;
}
