import type { PullOutcome } from './pull-messages';
import {
  REFRESH_LABELS,
  REFRESH_MESSAGES,
  REFRESH_TOASTS,
  type RefreshMessage,
} from '@/components/refresh-dialogs/refresh-messages';
import { anyRegistryPackageText } from '@/lib/packages/registries';
import type { PickKind } from '@/types/daily-updates.types';

/**
 * Every word of daily updates for a signed-in visitor, in one place: repositories and packages share the 3. Who else
 * added one is never said. `{entity}` is filled by the page's kind (`pickCopyOf`); `{name}`, the repository or package
 * being added, and `{time}`, the time left, by the caller. The copy says "repos", "packages" and "daily updates",
 * never "picks", and never "free": no update costs anything. ("Pick" stays a word of the code only.)
 */

/** Repositories and packages a visitor may pick at a time. */
export const PICKS_MAX = 3;

export const PICK_LABELS = {
  /** A repository or package that does not update every day yet: a press uses a pick, then refreshes it now. */
  updateDaily: 'Update daily',
  /** One on daily updates, for any reason: a press opens the dialog of when next. */
  updatesDaily: REFRESH_LABELS.updatesDaily,
} as const;

/** The line under the button. */
export const PICK_LINES = {
  /** Under "Update daily". */
  off: 'Update up to 3 repos or packages daily.',
  /** The visitor's own pick, before "Next update in {time}." */
  yourPick: 'You added it.',
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
    primary: 'Done',
    secondary: 'Close',
  },
  /** A fourth pick: one has to go first. */
  allPicksUsed: {
    title: 'You update 3 repos and packages daily',
    paragraph: 'Repos and packages share these 3. Remove one to add {name}.',
    primary: 'Done',
    secondary: 'Cancel',
  },
  /** No new pick left today; removing one does not give a new one back. */
  dailyLimit: {
    title: 'No more additions today',
    paragraph: 'You can add another repo or package in {time}.',
    primary: 'OK',
  },
} as const satisfies Record<string, PicksDialogCopy>;

/**
 * Anyone presses "Updates daily": when the next update comes, "Refresh now" while today's refresh is unused, and on
 * the visitor's own pick their list. The title on their own pick is `yourDailyUpdates`'.
 */
export const ON_DAILY_DIALOG = {
  title: 'This {entity} updates every day',
  refresh: REFRESH_LABELS.refreshNow,
  close: 'Close',
  done: 'OK',
} as const;

/** The list of the visitor's picks: its rows' labels, what each row is, and its last row. */
export const PICK_LIST = {
  profile: 'Your profile',
  remove: 'Remove',
  /** What each pick is, under its name. */
  kinds: { repo: 'Repository', package: anyRegistryPackageText() } satisfies Readonly<Record<PickKind, string>>,
  /** The muted last row, while one more can be added: "You can add 1 more repo or package." */
  left: (left: number) =>
    left === 1 ? 'You can add 1 more repo or package.' : `You can add ${left} more repos or packages.`,
} as const;

/** Before a pick: the star check, as the profile's Refresh says it. */
export const PICK_MESSAGES = {
  starStep: REFRESH_MESSAGES.starStep,
  blocked: REFRESH_MESSAGES.blocked,
} satisfies Record<string, RefreshMessage>;

export type PickMessageKind = keyof typeof PICK_MESSAGES;

export const PICK_TOASTS = {
  notHeld: 'This {entity} can’t be updated daily right now.',
  failed: REFRESH_TOASTS.checkFailed,
  busy: REFRESH_TOASTS.busy,
  removeFailed: 'It was not removed. Please try again.',
  /** Picked, and today's refresh of it started. */
  pickedRefreshing: 'Refreshing now. This {entity} is on daily updates.',
  /** Picked, and today's refresh of it is not allowed now: the pick stands. */
  pickedNoRefresh: 'This {entity} is on daily updates. Its first update comes soon.',
} as const;

/** Every word of daily updates that names what can be picked, for one page's kind. */
export type PickCopy = {
  lines: { off: string; yourPick: string };
  dialogs: {
    yourDailyUpdates: PicksDialogCopy;
    allPicksUsed: PicksDialogCopy;
    dailyLimit: PicksDialogCopy;
  };
  /** "This repository updates every day", by the page's kind. */
  onDailyTitle: string;
  toasts: { [key in keyof typeof PICK_TOASTS]: string };
};

/** "repository" or "package": the `{entity}` of the copy. */
const entityOf = (kind: PickKind) => (kind === 'package' ? 'package' : 'repository');

const fillEntity = (text: string, kind: PickKind) => text.replaceAll('{entity}', entityOf(kind));

/** Fills `{name}`, the repository or package being added. */
export const fillName = (text: string, name: string) => text.replaceAll('{name}', name);

/** The words of daily updates for a page of `kind`, `{entity}` filled; `{name}` and `{time}` are left for the caller. */
export function pickCopyOf(kind: PickKind): PickCopy {
  const toasts = Object.fromEntries(
    Object.entries(PICK_TOASTS).map(([key, text]) => [key, fillEntity(text, kind)]),
  ) as PickCopy['toasts'];
  return {
    lines: PICK_LINES,
    dialogs: PICK_DIALOGS,
    onDailyTitle: fillEntity(ON_DAILY_DIALOG.title, kind),
    toasts,
  };
}

/**
 * What a refresh right after a pick leads to: a refresh that runs says so with the pick, one that ends reloads the page
 * as always. Any refusal (today's fetch used, not ready, an error) is no failure of the pick, which stands: it is on
 * daily updates and its first update comes soon. `null`: no refresh was asked.
 */
export function pickedOutcomeOf(outcome: PullOutcome | null, toasts: PickCopy['toasts']): PullOutcome {
  if (outcome?.kind === 'poll') {
    return { kind: 'poll', toast: toasts.pickedRefreshing };
  }
  if (outcome?.kind === 'reload') {
    return outcome;
  }
  return { kind: 'toast', tone: 'success', text: toasts.pickedNoRefresh };
}
