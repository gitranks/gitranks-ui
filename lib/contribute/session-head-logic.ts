import type { ActionSource, CommentView, PendingSource } from './comment-actions';
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

/** The sources whose control asks first in a dialog: their error shows there while it is open. */
const DIALOG_SOURCES: ReadonlySet<ActionSource> = new Set(['submit', 'discard-run', 'discard-attempt']);

/**
 * Where an action's error shows: the push's in its confirm; the submit's and the discards' inside their dialog while it
 * is open (`dialog`: the source whose dialog is open); else the card.
 */
export const errorPlaceOf = (source: ActionSource, { dialog }: { dialog: ActionSource | null }): 'dialog' | 'card' =>
  source === 'push' || (DIALOG_SOURCES.has(source) && dialog === source) ? 'dialog' : 'card';

/** The cards a pane holds, by their `?move=` id and every kind they cover. */
export type HeldIds = { id: string; kinds: readonly string[] }[];

/** The held card a `move` names (any kind of it), else the first: the server's pick, so hydration matches. */
export const heldPickOf = (held: HeldIds, move: string | null | undefined): string =>
  (move && held.find(({ kinds }) => kinds.includes(move))?.id) || held[0]?.id || '';

/** The card to show now: the one shown while the pane still holds it, else the pick `move` names, else the first. */
export const shownPickOf = (held: HeldIds, shown: string | null, move: string | null | undefined): string =>
  shown && held.some(({ id }) => id === shown) ? shown : heldPickOf(held, move);

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
