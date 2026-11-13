import type { ActionSource, CommentView } from './comment-actions';
import type { ContributeAttemptDetail } from './contribute.types';
import type { Move, MoveKind } from './contribution-moves';
import { attemptActionErrorMessage, type ContributeActionResult } from './errors';
import type { ActionId } from './hard-stop';
import { nextRoundOpen } from './sessions';

/**
 * The session head's own logic, pure, so its client parts hold none a static render cannot test: which held card a
 * `?move=` shows, the address after a swap, what a Start sends, how a long action's failure is worded, where an error
 * shows, and a run of one action over several replies.
 */

/** The held card a `?move=` names (any kind of it), else the first; an unknown or stale value is ignored. */
export const pickOf = (held: Move[], move: string | null | undefined): Move =>
  held.find((each) => !!move && each.kinds.includes(move as MoveKind)) ?? held[0];

/** The address's query with `move` set and every other parameter kept (`session`, a grant's resume). */
export function mergeMove(search: string, kind: string): string {
  const params = new URLSearchParams(search);
  params.set('move', kind);
  return `?${params.toString()}`;
}

/** What a Start sends: the next-run card its chosen comments, "Try run N" and "Start a run anyway" none. */
export function startArgsOf(
  card: 'next-run' | 'try-run' | 'anyway',
  threads: CommentView['threads'],
): { commentIds?: string[] } {
  return card === 'next-run' ? (threads?.scope ?? {}) : {};
}

/** Said when a long action's call itself failed (the connection), with the form as the user left it. */
export const CONNECTION_FAILED =
  'Your PR could not be opened: the connection failed. Your title and description are as you left them. Submit again.';

/** Runs a long action: null when it went through, else its words (a refusal in our words, a throw as the connection). */
export async function runLong(call: () => Promise<ContributeActionResult<unknown>>): Promise<string | null> {
  try {
    const result = await call();
    return result.ok ? null : attemptActionErrorMessage(result.error, result.message);
  } catch {
    return CONNECTION_FAILED;
  }
}

/** Where an action's error shows: the submit's inside the form's open dialog, the push's in its confirm, else the card. */
export const errorPlaceOf = (source: ActionSource, { dialogOpen }: { dialogOpen: boolean }): 'dialog' | 'card' =>
  (source === 'submit' && dialogOpen) || source === 'push' ? 'dialog' : 'card';

/**
 * One action over several replies, in turn: how many went through, which did not, and the line a partial failure
 * shows ("Dismissed 5 of 7. Try again for the rest."); null when all went through. A throw counts as a failure.
 */
export async function runBatch(
  ids: readonly string[],
  call: (id: string) => Promise<ContributeActionResult<unknown>>,
  verb: 'Dismissed' | 'Posted',
): Promise<{ done: number; failed: string[]; line: string | null }> {
  const failed: string[] = [];
  for (const id of ids) {
    const result = await call(id).catch(() => null);
    if (!result?.ok) failed.push(id);
  }
  const done = ids.length - failed.length;
  return { done, failed, line: failed.length ? `${verb} ${done} of ${ids.length}. Try again for the rest.` : null };
}

/** A run may start: the PR is ours and open, none under way (`nextRoundOpen`), and no stop holds starts back. */
export const mayStartOf = (first: ContributeAttemptDetail | undefined, blocked: ReadonlySet<ActionId>): boolean =>
  !!first && nextRoundOpen(first) && !blocked.has('start_run');
