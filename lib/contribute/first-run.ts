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

/** When the first attempt starts, as far as the user's own state tells it. */
export type FirstRunStep =
  /** Attempts are not open yet. */
  | { kind: 'closed' }
  /** The user paused contributing. */
  | { kind: 'paused' }
  /** Anthropic refuses the stored key: nothing starts until a new one is connected. */
  | { kind: 'key-invalid' }
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
  if (key?.state === 'INVALID') return { kind: 'key-invalid' };
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

/**
 * Step 1 of the own agent's guide (B2): what holds its first claim. Only the user's pause does: attempts closed and a
 * key's state hold the agent we run, not theirs, so those notices stay beside the guide.
 */
export const agentFirstRunStepOf = (view: ContributeView): Extract<FirstRunStep, { kind: 'paused' | 'soon' }> =>
  isPaused(view) ? { kind: 'paused' } : { kind: 'soon' };

/** The notice step 1 says again in its own words, or null when it restates none. */
function restatedNoticeOf(step: FirstRunStep): ContributeNotice['kind'] | null {
  switch (step.kind) {
    case 'paused':
      return 'paused';
    case 'key-invalid':
      return 'key-invalid';
    case 'key-waiting':
      return step.reason === 'EXHAUSTED' ? 'exhausted' : 'limit-reached';
    default:
      return null;
  }
}

/**
 * The notices beside the guide: all of them but the one its step 1 restates. Step 1 shows only the first state that
 * holds, so every other block (a pause beside a used-up key, either while attempts are closed) stays said above it.
 */
export const firstRunNoticesOf = (notices: ContributeNotice[], step: FirstRunStep): ContributeNotice[] => {
  const restated = restatedNoticeOf(step);
  return notices.filter(({ kind }) => kind !== restated);
};
