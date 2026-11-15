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
  /** A repository that does not update every day yet: a press uses a pick. */
  updateDaily: 'Update daily',
  /** The visitor's own pick: a press opens their list. */
  updatesDaily: REFRESH_LABELS.updatesDaily,
} as const;

/** The line under the button. */
export const PICK_LINES = {
  off: 'Uses 1 of your 3 picks.',
  /** Before "Next update in {time}." */
  yourPick: 'Your pick.',
} as const;

/** A dialog with the visitor's picks: a title, one paragraph, the list, small print and its buttons. */
export type PicksDialogCopy = {
  title: string;
  paragraph: string;
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

/** In a pick's row of the list. */
export const PICK_LIST = {
  profile: 'Your profile',
  remove: 'Remove',
} as const;

/** The muted last row of the list: "1 pick left". */
export const picksLeftText = (left: number) => (left === 1 ? '1 pick left' : `${left} picks left`);

/** The star check before a pick, as the Refresh button's dialogs. */
export const PICK_MESSAGES = {
  needStar: {
    photo: true,
    title: 'Picks cost 1 star ⭐',
    paragraphs: [
      'That’s the full price. No card, no ads.',
      'Star our repo on GitHub, then press the button. Stars keep GitRanks alive.',
    ],
    signature: '— Vitalii',
    primary: '⭐ Star on GitHub',
    secondary: 'I starred it, pick',
  },
  blocked: REFRESH_MESSAGES.blocked,
} satisfies Record<string, RefreshMessage>;

export type PickMessageKind = keyof typeof PICK_MESSAGES;

export const PICK_TOASTS = {
  notHeld: 'This repository can’t be updated daily right now.',
  failed: REFRESH_TOASTS.checkFailed,
  busy: REFRESH_TOASTS.busy,
  removeFailed: 'The pick was not removed. Please try again.',
} as const;

export const fillRepo = (text: string, nameWithOwner: string) => text.replaceAll('{repo}', nameWithOwner);
