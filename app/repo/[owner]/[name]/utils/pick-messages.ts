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
 * Every word of a repository's daily updates for a signed-in visitor, in one place. Who else added a repository is
 * never said. `{time}` is filled with the time left. The copy says "repos" and "daily updates", never "picks", and
 * never "free": no update costs anything. ("Pick" stays a word of the code only.)
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
    title: 'You update 3 repos daily',
    paragraph: 'Remove one to add this repo.',
    primary: 'Done',
    secondary: 'Cancel',
  },
  /** No new pick left today; removing one does not give a new one back. */
  dailyLimit: {
    title: 'No more repos today',
    paragraph: 'You can add another repo in {time}.',
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

/** The muted last row of the list, while one more can be added: "You can add 1 more repo." */
export const picksLeftText = (left: number) =>
  left === 1 ? 'You can add 1 more repo.' : `You can add ${left} more repos.`;

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
  removeFailed: 'The repo was not removed. Please try again.',
  /** Picked, and today's refresh of it started. */
  pickedRefreshing: 'Refreshing now. This repository is on daily updates.',
  /** Picked, and today's refresh of it is not allowed now: the pick stands. */
  pickedNoRefresh: 'This repository is on daily updates. Its first update comes soon.',
} as const;

/** The kind of each row of the list, once packages are shown: what each one is. */
export const PICK_KIND_LABELS: Readonly<Record<PickKind, string>> = {
  repo: 'Repository',
  package: anyRegistryPackageText(),
};

/** The muted last row of the list once packages are shown: "You can add 1 more repo or package." */
const picksLeftWithPackages = (left: number) =>
  left === 1 ? 'You can add 1 more repo or package.' : `You can add ${left} more repos or packages.`;

/** The words of a pick's list: its rows' labels, what each row is (once packages are shown), and its last row. */
export type PickListCopy = {
  profile: string;
  remove: string;
  /** What each pick is, under its name; none while packages are not shown. */
  kinds?: Readonly<Record<PickKind, string>>;
  left: (left: number) => string;
};

/** Every word of daily updates that names what can be picked, in one wording. */
export type PickCopy = {
  lines: { off: string; yourPick: string };
  dialogs: {
    yourDailyUpdates: PicksDialogCopy;
    allPicksUsed: PicksDialogCopy;
    dailyLimit: PicksDialogCopy;
  };
  /** "This repository updates every day", by the page's kind. */
  onDailyTitle: string;
  list: PickListCopy;
  toasts: { [key in keyof typeof PICK_TOASTS]: string };
};

/** "repository" or "package": the `{entity}` of the copy. */
const entityOf = (kind: PickKind) => (kind === 'package' ? 'package' : 'repository');

const fillEntity = (text: string, kind: PickKind) => text.replaceAll('{entity}', entityOf(kind));

/** Fills `{name}`, the repository or package being added. */
export const fillName = (text: string, name: string) => text.replaceAll('{name}', name);

/** Today's words: daily updates name repositories only. */
const REPOS_ONLY: PickCopy = {
  lines: PICK_LINES,
  dialogs: PICK_DIALOGS,
  onDailyTitle: ON_DAILY_DIALOG.title,
  list: { ...PICK_LIST, left: picksLeftText },
  toasts: PICK_TOASTS,
};

/**
 * The words once packages are shown: repositories and packages share the 3. `{entity}` is filled by the page's kind;
 * `{name}` is left for the caller (`fillName`), `{time}` too.
 */
const WITH_PACKAGES = {
  lines: { ...PICK_LINES, off: 'Update up to 3 repos or packages daily.' },
  dialogs: {
    ...PICK_DIALOGS,
    allPicksUsed: {
      ...PICK_DIALOGS.allPicksUsed,
      title: 'You update 3 repos and packages daily',
      paragraph: 'Repos and packages share these 3. Remove one to add {name}.',
    },
    dailyLimit: {
      ...PICK_DIALOGS.dailyLimit,
      title: 'No more additions today',
      paragraph: 'You can add another repo or package in {time}.',
    },
  },
  onDailyTitle: 'This {entity} updates every day',
  list: { ...PICK_LIST, kinds: PICK_KIND_LABELS, left: picksLeftWithPackages },
  toasts: {
    ...PICK_TOASTS,
    notHeld: 'This {entity} can’t be updated daily right now.',
    removeFailed: 'It was not removed. Please try again.',
    pickedRefreshing: 'Refreshing now. This {entity} is on daily updates.',
    pickedNoRefresh: 'This {entity} is on daily updates. Its first update comes soon.',
  },
} satisfies PickCopy;

/**
 * The words of daily updates for a page of `kind`: the words that name repositories and packages, or, on the older
 * repository page (`packages` false), the ones that name repositories only.
 */
export function pickCopyOf(packages: boolean, kind: PickKind = 'repo'): PickCopy {
  if (!packages) {
    return REPOS_ONLY;
  }
  const toasts = Object.fromEntries(
    Object.entries(WITH_PACKAGES.toasts).map(([key, text]) => [key, fillEntity(text, kind)]),
  ) as PickCopy['toasts'];
  return { ...WITH_PACKAGES, onDailyTitle: fillEntity(WITH_PACKAGES.onDailyTitle, kind), toasts };
}

/**
 * What a refresh right after a pick leads to: a refresh that runs says so with the pick, one that ends reloads the page
 * as always. Any refusal (today's fetch used, not ready, an error) is no failure of the pick, which stands: the
 * repository is on daily updates and its first update comes soon. `null`: no refresh was asked.
 */
export function pickedOutcomeOf(outcome: PullOutcome | null, toasts: PickCopy['toasts'] = PICK_TOASTS): PullOutcome {
  if (outcome?.kind === 'poll') {
    return { kind: 'poll', toast: toasts.pickedRefreshing };
  }
  if (outcome?.kind === 'reload') {
    return outcome;
  }
  return { kind: 'toast', tone: 'success', text: toasts.pickedNoRefresh };
}
