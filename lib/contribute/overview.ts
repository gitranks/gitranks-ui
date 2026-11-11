import { effectiveSettingOf } from './access-limits';
import { AGENT_NAMES } from './attempt-format';
import type {
  ContributeAttempt,
  ContributeAttemptState,
  ContributeImpactTotals,
  ContributeIssue,
  ContributeIssuePage,
  ContributeMcpToken,
  ContributeScheduleCounts,
  ContributeView,
} from './contribute.types';
import { claudeKeyOf, isPaused } from './contribute-state';
import { type FirstRunStep, firstRunStepOf, isAgentAttempt } from './first-run';
import { AUTOPILOT_UNLOCK_AT } from './format';
import type { NeedsYouRead } from './needs-you';

/**
 * Overview, Contribute's home once the user is onboarded: what needs them, what runs right now, their impact, the ways
 * they contribute and what comes next. Each section is read on its own; these are its states, from what it read.
 */

/**
 * The states of the attempts that wait for the user, and how many of them Overview reads: the API's largest page.
 * The API lists them newest first, and the oldest are the closest to letting go, so the page must hold them all to be
 * ordered here. It does: at most one first attempt per open PR (10 at the most) and one follow-up per open PR.
 */
export const NEEDS_YOU_STATES: ContributeAttemptState[] = ['REVIEW', 'PENDING_AUTOSUBMIT'];
export const NEEDS_YOU_READ = 50;

/** The states of an attempt in flight, and how many of them Overview reads. */
export const IN_FLIGHT_STATES: ContributeAttemptState[] = ['CLAIMING', 'RUNNING', 'CHECKS'];
export const IN_FLIGHT_READ = 5;

/** The rows "Needs you" shows at most, the runs under way after them; the rest are counted, in My contributions. */
export const NEEDS_YOU_MAX = 5;

/** The picks "Up next" shows. */
export const UP_NEXT_PICKS = 3;

/** What "Needs you" reads (`needs-you.ts`); a read the API does not answer is `undefined`. */
export type OverviewNeedsRead = NeedsYouRead;

/** What "Right now" reads beside the view and the feed; a read the API does not answer is `undefined`. */
export type OverviewNowRead = {
  inFlight: ContributeAttempt[] | undefined;
  scheduleCounts: ContributeScheduleCounts | undefined;
};

const timeOf = (iso: string | null | undefined) => {
  const time = iso ? Date.parse(iso) : Number.NaN;
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
};

// ---------------------------------------------------------------------------------------------------------------------
// Right now

/** What the agent we run on the user's key does now, or the first thing that holds its next attempt. */
export type HostedState =
  /** An attempt on the key is in flight; `next` is what holds the one after it. */
  { kind: 'working'; attempt: ContributeAttempt; next: HostedHold } | HostedHold;

/** The first thing that holds the hosted agent's next attempt. */
export type HostedHold =
  | FirstRunStep
  /**
   * The user's own agent holds every slot of `attemptsAtATime`. `limited`: the access level holds the slots below the
   * setting, so Settings cannot add one.
   */
  | { kind: 'slots-taken'; slots: number; limited?: true }
  /** Every slot is busy, an attempt on the key among them: the next starts when one ends. */
  | { kind: 'slots-busy'; slots: number; limited?: true }
  /** The pull requests open or on their way reach the user's cap; `limited` as for the slots. */
  | { kind: 'pr-cap'; prBound: number; cap: number; limited?: true }
  /** The pace is "only issues I queue", and none is queued. */
  | { kind: 'nothing-queued' }
  /** A hold cannot be ruled out: a read it needs did not answer. */
  | { kind: 'unknown' };

/** What the user's own agent does now. */
export type OwnAgentState =
  | { kind: 'holding'; attempt: ContributeAttempt; agent: string | null; lastCallAt: string | null }
  | { kind: 'paused' }
  | { kind: 'never-called' }
  | { kind: 'idle'; token: string; lastCallAt: string }
  /** The attempts in flight did not answer: only its last call is known. */
  | { kind: 'unknown'; token: string | null; lastCallAt: string | null };

export type RightNow = {
  /** The hosted agent's card, for a user with a Claude key. */
  hosted?: HostedState;
  /** The cycle's card: a key's spend. */
  cycle: boolean;
  /** The own agent's card, for a user with a live token. */
  ownAgent?: OwnAgentState;
};

/** The view's own blocks: they hold before anything the scheduler counts. */
const VIEW_BLOCKS = new Set<FirstRunStep['kind']>(['suspended', 'paused', 'key-invalid', 'key-waiting']);

/**
 * The hosted agent's state: an attempt in flight, with what holds the next one, else that hold: the first of the
 * guide's states that holds, with the scheduler's three holds after the key's (slots, open PRs, nothing queued).
 * "Paced", "no issues" and "soon" need both the attempts in flight and the scheduler's counts: without them a hold
 * cannot be ruled out.
 */
function hostedStateOf(
  view: ContributeView,
  read: OverviewNowRead,
  page: ContributeIssuePage | null | undefined,
  now: Date,
): HostedState {
  const hosted = read.inFlight?.find((attempt) => !isAgentAttempt(view, attempt));
  const next = hostedHoldOf(view, read, page, now, !!hosted);
  return hosted ? { kind: 'working', attempt: hosted, next } : next;
}

function hostedHoldOf(
  view: ContributeView,
  read: OverviewNowRead,
  page: ContributeIssuePage | null | undefined,
  now: Date,
  working: boolean,
): HostedHold {
  const { inFlight, scheduleCounts: counts } = read;
  const step = firstRunStepOf(view, page, now);
  if (VIEW_BLOCKS.has(step.kind)) return step;

  const settings = view.contributor?.settings;
  // The slots and the open PRs cap as they hold now: the access level may hold them below the settings.
  const limits = view.contributor?.limits;
  const slots = settings ? effectiveSettingOf(settings, limits, 'attemptsAtATime') : 0;
  const prCap = settings ? effectiveSettingOf(settings, limits, 'openPrsAtATime') : 0;
  if (inFlight?.length && settings && inFlight.length >= slots) {
    // With none of them hosted, the user's own agent holds every slot.
    const limited = slots < settings.attemptsAtATime ? ({ limited: true } as const) : {};
    return { kind: working ? 'slots-busy' : 'slots-taken', slots, ...limited };
  }
  if (counts && settings && counts.prBound >= prCap) {
    const limited = prCap < settings.openPrsAtATime ? ({ limited: true } as const) : {};
    return { kind: 'pr-cap', prBound: counts.prBound, cap: prCap, ...limited };
  }
  if (counts && settings?.pace === 'QUEUED' && counts.queued === 0) return { kind: 'nothing-queued' };
  if (step.kind === 'no-room') return step;
  if (!inFlight || !counts || !settings) return { kind: 'unknown' };
  // Without the feed, "no issues" cannot be ruled out.
  if (step.kind === 'soon' && page === undefined) return { kind: 'unknown' };
  return step;
}

/** The token the user's agent called with last; none before its first call. */
export const lastUsedTokenOf = (tokens: ContributeMcpToken[] | undefined): ContributeMcpToken | undefined =>
  (tokens ?? []).filter((token) => token.lastUsedAt).sort((a, b) => timeOf(b.lastUsedAt) - timeOf(a.lastUsedAt))[0];

function ownAgentStateOf(view: ContributeView, read: OverviewNowRead): OwnAgentState | undefined {
  if (!view.ownAgent?.paths.mcp) return undefined;
  const last = lastUsedTokenOf(view.ownAgent.tokens);
  const held = read.inFlight?.find((attempt) => isAgentAttempt(view, attempt));
  if (held) {
    const agent = held.agent ? (AGENT_NAMES[held.agent.name] ?? held.agent.name) : (last?.name ?? null);
    return { kind: 'holding', attempt: held, agent, lastCallAt: last?.lastUsedAt ?? null };
  }
  if (!read.inFlight) return { kind: 'unknown', token: last?.name ?? null, lastCallAt: last?.lastUsedAt ?? null };
  if (isPaused(view)) return { kind: 'paused' };
  if (!last?.lastUsedAt) return { kind: 'never-called' };
  return { kind: 'idle', token: last.name, lastCallAt: last.lastUsedAt };
}

/** "Right now": a card for the hosted agent and its cycle (a key), and one for the user's own agent (a live token). */
export function rightNowOf(
  view: ContributeView,
  read: OverviewNowRead,
  page: ContributeIssuePage | null | undefined,
  now = new Date(),
): RightNow {
  const key = !!claudeKeyOf(view);
  // Whose an attempt in flight is comes from the own-agent fields, read on their own: unanswered beside a key, an
  // attempt could be either agent's, so what depends on it is read as not answered.
  const runnersUnread = key && !!read.inFlight?.some((attempt) => attempt.runner === undefined);
  const known: OverviewNowRead = runnersUnread ? { ...read, inFlight: undefined } : read;
  return {
    ...(key ? { hosted: hostedStateOf(view, known, page, now) } : {}),
    cycle: key,
    ...(view.ownAgent?.paths.mcp ? { ownAgent: ownAgentStateOf(view, known) } : {}),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Your impact

export type ImpactTile = { name: 'merged' | 'open' | 'repos' | 'autopilot'; value: string; label: string };

/** The four tiles; `undefined` when the totals are not answered. Repos helped alone unanswered reads "–". */
export function impactTilesOf(
  view: ContributeView,
  totals: ContributeImpactTotals | undefined,
): ImpactTile[] | undefined {
  if (!totals) return undefined;
  const autopilot = view.contributor?.autopilot;
  const toUnlock = Math.max(
    0,
    autopilot?.mergedToUnlock ?? AUTOPILOT_UNLOCK_AT - (autopilot?.mergedCount ?? totals.merged),
  );
  const merged = Math.min(AUTOPILOT_UNLOCK_AT, Math.max(0, AUTOPILOT_UNLOCK_AT - toUnlock));
  return [
    { name: 'merged', value: String(totals.merged), label: 'pull requests merged' },
    { name: 'open', value: String(totals.open), label: 'open, waiting on maintainers' },
    {
      name: 'repos',
      value: typeof totals.reposHelped === 'number' ? String(totals.reposHelped) : '–',
      label: 'repos helped',
    },
    autopilot?.unlocked
      ? { name: 'autopilot', value: 'On', label: 'autopilot unlocked' }
      : { name: 'autopilot', value: `${merged} of ${AUTOPILOT_UNLOCK_AT}`, label: 'merged to unlock autopilot' },
  ];
}

// ---------------------------------------------------------------------------------------------------------------------
// Up next

/** The feed's issues in rank order. */
export const rankedOf = (page: ContributeIssuePage): ContributeIssue[] =>
  [...page.items].sort((a, b) => a.rank - b.rank);
