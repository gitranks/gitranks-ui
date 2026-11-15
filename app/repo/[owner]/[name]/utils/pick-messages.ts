import type { PullOutcome } from './pull-messages';
import {
  REFRESH_LABELS,
  REFRESH_MESSAGES,
  REFRESH_TOASTS,
  type RefreshMessage,
} from '@/components/refresh-dialogs/refresh-messages';

/**
 * Every word of a repository's daily updates for a signed-in visitor: their picks, in one place. Who else picked a
 * repository is never said. `{repo}` is filled with the repository's `owner/name`, `{time}` with the time left.
 */

/** Repositories a visitor may pick at a time. */
export const PICKS_MAX = 3;

export const PICK_LABELS = {
  /** A repository that does not update every day yet: a press uses a pick, then refreshes it now. */
  updateDaily: 'Update daily',
  /** A repository on daily updates, for any reason: a press opens the dialog of when next. */
  updatesDaily: REFRESH_LABELS.updatesDaily,
} as const;

/** The line under the button. */
export const PICK_LINES = {
  /** Under "Update daily". */
  off: 'Update up to 3 repos daily.',
  /** Before "Next update in {time}." */
  yourPick: 'Your pick.',
} as const;

/** A dialog with the visitor's picks: a title, one paragraph, the list, small print and its buttons. */
export type PicksDialogCopy = {
  title: string;
  paragraph?: string;
  note?: string;
  primary: string;
  secondary?: string;
};

export const PICK_DIALOGS = {
  /** The visitor presses "Updates daily" on their own pick. */
  yourDailyUpdates: {
    title: 'Your daily updates',
    paragraph: 'We update these every day. They stay on for 7 days after your last visit.',
    note: 'You can add 3 picks a day.',
    primary: 'Done',
    secondary: 'Close',
  },
  /** A fourth pick: one has to go first. */
  allPicksUsed: {
    title: 'All 3 picks are used',
    paragraph: 'Remove one to update {repo} every day.',
    primary: 'Done',
    secondary: 'Cancel',
  },
  /** Three new picks today already; removing one does not give a new one back. */
  dailyLimit: {
    title: 'No new picks left today',
    paragraph: 'You can add 3 picks a day. The next one opens in {time}.',
    primary: 'OK',
  },
} as const satisfies Record<string, PicksDialogCopy>;

/**
 * Anyone presses "Updates daily": when the next update comes, "Refresh now" while today's refresh is unused, and on
 * the visitor's own pick their list. The title on their own pick is `yourDailyUpdates`'.
 */
export const ON_DAILY_DIALOG = {
  title: 'This repository updates every day',
  refresh: REFRESH_LABELS.refreshNow,
  close: 'Close',
  done: 'OK',
} as const;

/** In a pick's row of the list. */
export const PICK_LIST = {
  profile: 'Your profile',
  remove: 'Remove',
} as const;

/** The muted last row of the list: "1 pick left". */
export const picksLeftText = (left: number) => (left === 1 ? '1 pick left' : `${left} picks left`);

/** Before a pick: the star check, as the profile's Refresh says it. */
export const PICK_MESSAGES = {
  starStep: REFRESH_MESSAGES.starStep,
  blocked: REFRESH_MESSAGES.blocked,
} satisfies Record<string, RefreshMessage>;

export type PickMessageKind = keyof typeof PICK_MESSAGES;

export const PICK_TOASTS = {
  notHeld: 'This repository can’t be updated daily right now.',
  failed: REFRESH_TOASTS.checkFailed,
  busy: REFRESH_TOASTS.busy,
  removeFailed: 'The pick was not removed. Please try again.',
  /** Picked, and today's refresh of it started. */
  pickedRefreshing: 'Refreshing now. This repository is on daily updates.',
  /** Picked, and today's refresh of it is not allowed now: the pick stands. */
  pickedNoRefresh: 'This repository is on daily updates. Its first update comes soon.',
} as const;

/**
 * What a refresh right after a pick leads to: a refresh that runs says so with the pick, one that ends reloads the page
 * as always. Any refusal (today's fetch used, not ready, an error) is no failure of the pick, which stands: the
 * repository is on daily updates and its first update comes soon. `null`: no refresh was asked.
 */
export function pickedOutcomeOf(outcome: PullOutcome | null): PullOutcome {
  if (outcome?.kind === 'poll') {
    return { kind: 'poll', toast: PICK_TOASTS.pickedRefreshing };
  }
  if (outcome?.kind === 'reload') {
    return outcome;
  }
  return { kind: 'toast', tone: 'success', text: PICK_TOASTS.pickedNoRefresh };
}

export const fillRepo = (text: string, nameWithOwner: string) => text.replaceAll('{repo}', nameWithOwner);
