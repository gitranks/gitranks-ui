import type { PendingSource } from './comment-actions';
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

/** Said when a submit's call itself failed (the connection), with the form as the user left it. */
export const CONNECTION_FAILED =
  'Your PR could not be opened: the connection failed. Your title and description are as you left them. Submit again.';

/** What each long action says when its call itself failed (the connection): what did not happen, and what to do. */
export const CONNECTION_FAILED_OF: Record<PendingSource, string> = {
  submit: CONNECTION_FAILED,
  push: 'The push could not be sent: the connection failed. Nothing was pushed or posted. Try again.',
  'discard-run': 'The run could not be discarded: the connection failed. Try again.',
  'discard-attempt': 'It could not be discarded: the connection failed. Try again.',
  'send-back': 'It could not be sent back: the connection failed. Your note is as you left it. Send it again.',
  start: 'The run could not be started: the connection failed. Your note is as you left it. Start it again.',
};

/**
 * Runs a long action: null when it went through, else its words (a refusal in our words, a throw as the connection's
 * sentence for that action; the submit's by default).
 */
export async function runLong(
  call: () => Promise<ContributeActionResult<unknown>>,
  connection: string = CONNECTION_FAILED,
): Promise<string | null> {
  try {
    const result = await call();
    return result.ok ? null : attemptActionErrorMessage(result.error, result.message);
  } catch {
    return connection;
  }
}

/** A run may start: the PR is ours and open, none under way (`nextRoundOpen`), and no stop holds starts back. */
export const mayStartOf = (first: ContributeAttemptDetail | undefined, blocked: ReadonlySet<ActionId>): boolean =>
  !!first && nextRoundOpen(first) && !blocked.has('start_run');
