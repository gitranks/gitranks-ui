import { builderHref } from '@/app/badge/builder/[[...login]]/utils/builder-state';
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

/** The small print's link to the badge builder, for this repository. */
const BADGE_LINK = 'GitRanks badge';

/** Before a pick: the deal for a visitor not signed in, then the star check, as the profile's Refresh says them. */
export const PICK_MESSAGES = {
  /** Not signed in, presses "Update daily": the deal, with a badge as the way for the repository's own people. */
  picksDeal: {
    photo: true,
    title: 'Hi, I’m Vitalii 👋',
    paragraphs: [
      'I made GitRanks. Bots press these buttons a lot, and our GitHub limits are small. So here is the deal:',
    ],
    steps: ['Sign in with GitHub. We only see your name and email.', 'Star our repo.'],
    closing: ['Then you pick 3 repositories. We update them, and your profile, every day.'],
    note: 'Is this your repository? Add a GitRanks badge to its README. While the badge is there, we update it every day. No sign-in needed.',
    noteLinks: [{ text: BADGE_LINK, href: '/badge/builder' }],
    primary: 'Sign in with GitHub',
    secondary: 'Maybe later',
  },
  starStep: REFRESH_MESSAGES.starStep,
  blocked: REFRESH_MESSAGES.blocked,
} satisfies Record<string, RefreshMessage>;

/** The deal on this repository's page: its badge link opens the builder for it. */
export const picksDealOf = (nameWithOwner: string): RefreshMessage => ({
  ...PICK_MESSAGES.picksDeal,
  noteLinks: [{ text: BADGE_LINK, href: builderHref({ kind: 'repo', name: nameWithOwner }) }],
});

export type PickMessageKind = keyof typeof PICK_MESSAGES;

export const PICK_TOASTS = {
  notHeld: 'This repository can’t be updated daily right now.',
  failed: REFRESH_TOASTS.checkFailed,
  busy: REFRESH_TOASTS.busy,
  removeFailed: 'The pick was not removed. Please try again.',
  /** Back from the deal's sign-in, and the API keeps daily updates closed to this account. */
  notOpen: 'Daily updates aren’t open to your account yet. Please try again later.',
} as const;

export const fillRepo = (text: string, nameWithOwner: string) => text.replaceAll('{repo}', nameWithOwner);
