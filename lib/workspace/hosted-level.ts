import type {
  ContributeAutopilot,
  ContributeHostedLevel,
  ContributeLimits,
  ContributeScheduleCounts,
  ContributeSettings,
  ContributeSettingsInput,
  ContributeSpend,
} from './contribute.types';
import { AUTOPILOT_UNLOCK_AT, dayLabel, shownPaceOf, timeLeftLabel } from './format';
import { limitReachedOf } from './limit-words';

/** Autopilot is on: the hosted agent's level chosen, and unlocked by the user's record. */
export const autopilotOnOf = (
  contributor:
    | { settings?: Pick<ContributeSettings, 'hostedLevel'> | null; autopilot?: ContributeAutopilot | null }
    | null
    | undefined,
): boolean => contributor?.settings?.hostedLevel === 'AUTOPILOT' && !!contributor.autopilot?.unlocked;

/** The three levels of the hosted agent, in order: each includes the one before it. */
export const HOSTED_LEVELS: { level: ContributeHostedLevel; title: string; text: string }[] = [
  { level: 'MANUAL', title: 'You start each issue', text: 'Nothing runs until you press Start on an issue.' },
  {
    level: 'NEXT',
    title: 'It starts the next issue by itself',
    text: 'Paced across your budget. You review every change before it goes out.',
  },
  {
    level: 'AUTOPILOT',
    title: 'Autopilot',
    text: 'It also submits the pull request, for changes the hosted agent made.',
  },
];

/** A start the agent makes by itself this close is "within a few minutes". */
const SOON_MS = 5 * 60_000;

/**
 * When the hosted agent starts its next issue by itself, under the levels that do (`NEXT` and `AUTOPILOT`): after the
 * user resumes, while their own pause holds; at the open pull request limit, when one is merged or closed; with no
 * room in the budget, never; else soon, or in about that long. Null at `MANUAL`, while the spend is not known, and
 * while a refused key pauses it (the key's row says so).
 */
export function nextIssueLineOf(
  level: ContributeHostedLevel,
  {
    paused = null,
    spend,
    counts,
    settings,
    limits,
  }: {
    /** Paused by the user themselves (`you`), or by a refused key (`key`). */
    paused?: 'you' | 'key' | null;
    spend: Pick<ContributeSpend, 'nextAttemptAt'> | null | undefined;
    counts: Pick<ContributeScheduleCounts, 'prBound'> | null | undefined;
    settings: Pick<ContributeSettings, 'attemptsAtATime' | 'openPrsAtATime'> | null | undefined;
    limits: ContributeLimits | null | undefined;
  },
  now = new Date(),
): string | null {
  if (level === 'MANUAL' || paused === 'key') return null;
  if (paused === 'you') return 'Next issue: after you resume';
  if (!spend) return null;
  if (limitReachedOf(counts, settings, limits)) return 'Next issue: when a pull request is merged or closed';
  if (!spend.nextAttemptAt) return 'Next issue: your budget leaves no room for a run';
  const at = new Date(spend.nextAttemptAt).getTime();
  if (Number.isNaN(at)) return null;
  if (at - now.getTime() <= SOON_MS) return 'Next issue: within a few minutes, when one fits you';
  return `Next issue: in about ${timeLeftLabel(spend.nextAttemptAt, now)}`;
}

/** Closed-unmerged pull requests in a row that lock autopilot again. */
export const AUTOPILOT_LOCK_AT = 2;

/** Where the record stands: locked, open, merges still needed and made toward unlocking, the closed streak. */
export function autopilotRecordOf(autopilot: ContributeAutopilot) {
  const locked = !autopilot.unlocked;
  const toUnlock = locked ? Math.max(0, autopilot.mergedToUnlock ?? AUTOPILOT_UNLOCK_AT - autopilot.mergedCount) : 0;
  return {
    locked,
    open: autopilot.available === true,
    // `undefined`: the API does not say yet; only a known "none" blocks choosing it.
    noEmail: autopilot.noticeTo === null,
    toUnlock,
    progress: Math.min(AUTOPILOT_UNLOCK_AT, Math.max(0, AUTOPILOT_UNLOCK_AT - toUnlock)),
    streak: Math.min(autopilot.closedUnmergedStreak, AUTOPILOT_LOCK_AT),
  };
}

/**
 * Whether the Autopilot card can be chosen, and its pill: the platform not open yet ("After launch month"), locked
 * until enough merged ("After 5 merged pull requests · 1 of 5", or since the last lock). `noEmail`: open and unlocked,
 * and no address for its emails, the one thing in the way. `lockedAfterChosen`: the level is `AUTOPILOT` but locked
 * again, so it works as the level below it.
 */
export function autopilotChoiceOf(autopilot: ContributeAutopilot, level: ContributeHostedLevel) {
  const { locked, open, noEmail, progress } = autopilotRecordOf(autopilot);
  const pill = !open
    ? 'After launch month'
    : !locked
      ? null
      : autopilot.lockedAt
        ? `Locked on ${dayLabel(autopilot.lockedAt)} · ${progress} of ${AUTOPILOT_UNLOCK_AT} merged since`
        : `After ${AUTOPILOT_UNLOCK_AT} merged pull requests · ${progress} of ${AUTOPILOT_UNLOCK_AT}`;
  return {
    pill,
    noEmail: open && !locked && noEmail,
    canChoose: open && !locked && !noEmail,
    lockedAfterChosen: level === 'AUTOPILOT' && locked,
  };
}

/**
 * A budget and pacing save never moves the level. The pace goes only when it is not the one the form showed; over a
 * stored `QUEUED` pace (shown as `EVEN`) it goes with the level as it is, since the API would read even or fast over
 * `QUEUED` as "start issues by itself".
 */
export function paceSaveOf(
  patch: ContributeSettingsInput,
  stored: Pick<ContributeSettings, 'pace' | 'hostedLevel'>,
): ContributeSettingsInput {
  if (patch.pace === undefined) return patch;
  const { pace, ...rest } = patch;
  if (pace === shownPaceOf(stored.pace)) return rest;
  return stored.pace === 'QUEUED' ? { ...patch, hostedLevel: stored.hostedLevel } : patch;
}

/** Where the level control stands: the level last sent (or read), the card shown, the Autopilot confirm open. */
export type LevelPicking = { saved: ContributeHostedLevel; shown: ContributeHostedLevel; confirming: boolean };

/**
 * What happens on the control: a card picked (`shown` at once, `settled` once the user stops arrowing), the confirm's
 * button or its Cancel and Escape, a refused save (back to the level `before` it), and the page reading the level again.
 */
export type LevelPickEvent =
  | { kind: 'shown'; level: ContributeHostedLevel }
  | { kind: 'settled'; level: ContributeHostedLevel }
  | { kind: 'confirm' }
  | { kind: 'cancel' }
  | { kind: 'refused'; before: ContributeHostedLevel }
  | { kind: 'read'; level: ContributeHostedLevel };

/**
 * The control's next state, and the level to save (only `{ hostedLevel }` is ever sent), or null. A pick back to the
 * level last sent saves nothing; Autopilot opens the confirm and saves only from its button; Cancel shows the level last
 * sent again; a refusal puts back the level before.
 */
export function levelPickStep(
  state: LevelPicking,
  event: LevelPickEvent,
): { state: LevelPicking; send: ContributeHostedLevel | null } {
  switch (event.kind) {
    case 'shown':
      return { state: { ...state, shown: event.level }, send: null };
    case 'settled':
      if (event.level === state.saved) return { state: { ...state, shown: state.saved }, send: null };
      if (event.level === 'AUTOPILOT') return { state: { ...state, shown: 'AUTOPILOT', confirming: true }, send: null };
      return { state: { saved: event.level, shown: event.level, confirming: false }, send: event.level };
    case 'confirm':
      return { state: { saved: 'AUTOPILOT', shown: 'AUTOPILOT', confirming: false }, send: 'AUTOPILOT' };
    case 'cancel':
      return { state: { ...state, shown: state.saved, confirming: false }, send: null };
    case 'refused':
      return { state: { saved: event.before, shown: event.before, confirming: false }, send: null };
    case 'read':
      return { state: { saved: event.level, shown: event.level, confirming: false }, send: null };
  }
}
