import { readInterviewsKeyWithin } from '@/components/interviews/interviews-read';
import { INTERVIEWS_START_MINE_PATH, INTERVIEWS_STOP_MINE_PATH, interviewPlanMinePath } from '@/lib/interviews/paths';
import type { InterviewPlanMine, InterviewStopReason } from '@/lib/interviews/types';

/*
 * The plan's page in the browser: the person's read of the plan, and starting and stopping it. None throws.
 */

const STATES: ReadonlySet<string> = new Set(['none', 'in_progress', 'stopped', 'finished']);

/** A whole read of the person's plan, or null: a part of one would mark the page wrong. */
export function planMineOf(value: unknown): InterviewPlanMine | null {
  if (!value || typeof value !== 'object') return null;
  const mine = value as InterviewPlanMine;
  if (typeof mine.state !== 'string' || !STATES.has(mine.state) || !Array.isArray(mine.rounds)) return null;
  if (!mine.rounds.every((round) => round && typeof round.number === 'number' && Array.isArray(round.items))) {
    return null;
  }
  return {
    ...mine,
    here: typeof mine.here === 'number' ? mine.here : null,
    learnedBefore: typeof mine.learnedBefore === 'number' ? mine.learnedBefore : 0,
    justDone: typeof mine.justDone === 'number' ? mine.justDone : null,
    reviewDue: mine.reviewDue === true,
    next: mine.next ?? null,
  };
}

/** The person's plan; null on any failure or past the wait. */
export async function readPlanMine(company: string, plan: string): Promise<InterviewPlanMine | null> {
  return planMineOf(await readInterviewsKeyWithin(interviewPlanMinePath(company, plan), 'mine'));
}

/** How a start or a stop ended: the plan for the person, a session that is gone, or anything else. */
export type PlanSent = { kind: 'ok'; mine: InterviewPlanMine } | { kind: 'signed_out' } | { kind: 'failed' };

async function send(path: string, body: Record<string, unknown>): Promise<PlanSent> {
  try {
    const res = await fetch(path, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 401) return { kind: 'signed_out' };
    if (!res.ok) return { kind: 'failed' };
    const result = (await res.json()) as { ok?: boolean; data?: unknown } | null;
    const mine = result?.ok ? planMineOf(result.data) : null;
    return mine ? { kind: 'ok', mine } : { kind: 'failed' };
  } catch {
    return { kind: 'failed' };
  }
}

/** Starts the plan, or starts it again once stopped. */
export const startPlan = (company: string, plan: string) => send(INTERVIEWS_START_MINE_PATH, { company, plan });

/** Stops the plan, with the reason picked or none. */
export const stopPlan = (company: string, plan: string, reason: InterviewStopReason | null) =>
  send(INTERVIEWS_STOP_MINE_PATH, { company, plan, reason });
