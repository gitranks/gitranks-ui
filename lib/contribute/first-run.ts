import type { ContributeAttempt, ContributeIssuePage, ContributeView } from './contribute.types';
import { type ContributeNotice, claudeKeyOf, isOnboarded, isPaused } from './contribute-state';

/**
 * The first-run guide ("You're in. Here's what happens next") opens Issues and Overview for a contributor with a
 * Claude key and no attempt yet; once one exists, today's status takes its place. Not while the API does not answer
 * the attempts: nothing says there are none.
 */
export const isFirstRun = (view: ContributeView, attempts: ContributeAttempt[] | undefined): boolean =>
  isOnboarded(view) && !!claudeKeyOf(view) && attempts !== undefined && attempts.length === 0;

/**
 * An attempt of the user's own agent. One the API does not say the runner of is the agent's when there is no Claude key
 * to have run it.
 */
const isAgentAttempt = (view: ContributeView, attempt: ContributeAttempt) =>
  attempt.runner === 'MCP' || (attempt.runner === undefined && !claudeKeyOf(view));

/**
 * The own agent's "What happens next" (B2): for an onboarded user while their agent has made no attempt. Not while the
 * API does not answer the attempts.
 */
export const isAgentFirstRun = (view: ContributeView, attempts: ContributeAttempt[] | undefined): boolean =>
  isOnboarded(view) && attempts !== undefined && !attempts.some((attempt) => isAgentAttempt(view, attempt));

/** The notices the guide's step 1 already gives, left out beside it. */
export const FIRST_RUN_NOTICES: ReadonlySet<ContributeNotice['kind']> = new Set([
  'paused',
  'exhausted',
  'limit-reached',
]);

/** When the first attempt starts, as far as the user's own state tells it. */
export type FirstRunStep =
  /** Attempts are not open yet. */
  | { kind: 'closed' }
  /** The user paused contributing. */
  | { kind: 'paused' }
  /** The key's credits, or its workspace's spend limit, are used up until `until`. */
  | { kind: 'key-waiting'; reason: 'EXHAUSTED' | 'LIMIT_REACHED'; until: string | null }
  /** No allowance ever covers one attempt under the caps. */
  | { kind: 'no-room' }
  /** Pacing keeps the credits for later in the month: the first one starts at `at`. */
  | { kind: 'paced'; at: string }
  /** Nothing is picked for the user yet. */
  | { kind: 'no-issues' }
  /** Nothing holds it on the user's side. */
  | { kind: 'soon' };

/**
 * Step 1 of the guide: the first of these that holds. It never names an issue, as the scheduler picks, not the list's
 * order; and it promises no time, as the scheduler may still hold for reasons the view does not carry. `page` is the
 * feed's first page, `undefined` when the API does not answer it (then it is not called empty).
 */
export function firstRunStepOf(
  view: ContributeView,
  page: ContributeIssuePage | null | undefined,
  now = new Date(),
): FirstRunStep {
  if (view.attemptsOpen === false) return { kind: 'closed' };
  if (isPaused(view)) return { kind: 'paused' };

  const key = claudeKeyOf(view);
  if (key?.state === 'EXHAUSTED' || key?.state === 'LIMIT_REACHED') {
    return { kind: 'key-waiting', reason: key.state, until: key.blockedUntil };
  }

  const spend = view.contributor?.spend;
  if (spend && spend.nextAttemptAt === null) return { kind: 'no-room' };
  if (spend?.nextAttemptAt && new Date(spend.nextAttemptAt).getTime() > now.getTime()) {
    return { kind: 'paced', at: spend.nextAttemptAt };
  }

  if (page === null || (page && page.items.length === 0)) return { kind: 'no-issues' };
  return { kind: 'soon' };
}
