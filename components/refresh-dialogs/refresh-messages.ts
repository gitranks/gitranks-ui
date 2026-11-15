/**
 * Every word the Refresh button says, in one place, so the copy can be read and changed without the code.
 * Plain words and short sentences on purpose: many readers are not native English speakers. `{time}` is filled with
 * the time left, like "13 h 20 min", in a title or a paragraph; `{login}` with the profile's login.
 */

export const MAKER = {
  name: 'Vitalii',
  avatarUrl: 'https://avatars.githubusercontent.com/u/3485490?v=4',
} as const;

export const STAR_REPO_URL = 'https://github.com/gitranks/gitranks-ui';
export const GITHUB_AUTHORIZATIONS_URL = 'https://github.com/settings/apps/authorizations';

/**
 * A link inside a message's small print: its text, as written there, and where it goes. Without `href` it is an action
 * the dialog does (`onNoteAction`).
 */
export type NoteLink = { text: string; href?: string };

export type RefreshMessage = {
  /** The maker's photo beside the title: on the notes that read as from him. */
  photo?: boolean;
  title: string;
  /** Before the paragraphs: the steps of a deal, each done or not, numbered by its place. */
  checklist?: { text: string; done?: boolean }[];
  paragraphs: string[];
  /** A numbered list after the paragraphs. */
  steps?: string[];
  /** Paragraphs after the steps. */
  closing?: string[];
  /** Small print after the steps. Each of `noteLinks` inside it becomes a link. */
  note?: string;
  noteLinks?: NoteLink[];
  /** Signed under the text. */
  signature?: string;
  primary: string;
  /** A star before the primary button's label. */
  primaryIcon?: 'star';
  secondary: string;
};

export const TOKEN_NOTE = {
  note: 'GitHub will say we can “act on your behalf”. We only read GitHub data to build stats. You can remove access any time in GitHub settings.',
  noteLinks: [{ text: 'GitHub settings', href: GITHUB_AUTHORIZATIONS_URL }],
};

/** The small print's link that checks the profile's badge now, in the deal. */
export const CHECK_BADGE_LINK = 'Check my badge';
/** The deal's last sentence: the badge check of the profile on screen. */
const CHECK_BADGE_SENTENCE = `Already added it? ${CHECK_BADGE_LINK}.`;

/** The second step of the deal: what it says once the visitor is signed in and has not starred our repo yet. */
const STAR_STEP: RefreshMessage = {
  photo: true,
  title: 'One step left: star our repo',
  checklist: [{ text: 'Signed in with GitHub.', done: true }, { text: 'Star our repo.' }],
  paragraphs: ['Then come back and press “I starred it”. We check the star and start your daily updates.'],
  note: 'That’s the full price. No card, no ads.',
  primary: 'Star on GitHub',
  primaryIcon: 'star',
  secondary: 'I starred it',
};

/** The star step when "I starred it" claims today's refresh: no daily updates start from it. */
export const STAR_STEP_REFRESH: RefreshMessage = {
  ...STAR_STEP,
  paragraphs: ['Then come back and press “I starred it”. We check the star and refresh your profile.'],
};

export const REFRESH_MESSAGES = {
  /** Not signed in, presses "Fetch profile from GitHub" on a profile GitRanks does not have: no badge to offer yet. */
  signIn: {
    photo: true,
    title: 'Hi, I’m Vitalii 👋',
    paragraphs: [
      'I made GitRanks. Bots press this button a lot, and our GitHub limits are small.',
      'So here is the deal:',
    ],
    steps: [
      'Sign in with GitHub. We only see your name and email.',
      'Star our repo.',
      'Get 1 refresh of your profile every day.',
    ],
    closing: ['Need more? Later you can use your own GitHub token.'],
    primary: 'Sign in with GitHub',
    secondary: 'Maybe later',
  },

  /**
   * Not signed in, presses Refresh or "Get daily updates": the deal, with a badge as the way in without a star. Its
   * "Check my badge" checks the profile on screen, and is left out where that profile is someone else's.
   */
  deal: {
    photo: true,
    title: 'Hi, I’m Vitalii 👋',
    paragraphs: [
      'I made GitRanks. Bots press this button a lot, and our GitHub limits are small. So here is the deal:',
    ],
    steps: ['Sign in with GitHub. We only see your name and email.', 'Star our repo.'],
    closing: [
      'Then we update your profile every day. It stays on for 7 days after your last visit.',
      'You can also update up to 3 repos daily.',
    ],
    note: 'Don’t want to star? Add a GitRanks badge to your GitHub profile. While the badge is there, we update your profile every day. No sign-in, no 7-day limit. Already added it? Check my badge.',
    noteLinks: [{ text: 'GitRanks badge', href: '/badge/builder' }, { text: CHECK_BADGE_LINK }],
    primary: 'Sign in with GitHub',
    secondary: 'Maybe later',
  },

  /** Signed in, own profile, the check found no star: also opens by itself after a sign-in from the deal. */
  starStep: STAR_STEP,

  /** Signed in, own profile, today's refresh is used. */
  used: {
    title: 'Easy, tiger 🐯',
    paragraphs: [
      'Your next refresh is in {time}.',
      'Too long? Use your own GitHub token and refresh any profile, any time. It runs on your GitHub limits, not ours, so there is no daily cap.',
    ],
    primary: 'Use my GitHub token',
    secondary: 'I’ll wait',
  },

  /** Signed in without a token, someone else's profile. */
  otherProfile: {
    title: 'Checking on a friend? 👀',
    paragraphs: [
      'Nice! Our daily refresh is only for your own profile.',
      'Use your own GitHub token to refresh any profile, any time. It runs on your GitHub limits, not ours.',
    ],
    ...TOKEN_NOTE,
    primary: 'Use my GitHub token',
    secondary: 'Maybe later',
  },

  /** Too many checks without a star; checks pause for {time}. */
  blocked: {
    title: 'Our robot needs a break 🥱',
    paragraphs: ['It checked a few times and found no star.', 'Try again in {time}.'],
    note: 'Tip: on our repo page the button should say “⭐ Starred”.',
    primary: '⭐ Open our repo',
    secondary: 'OK',
  },

  /** The owner, on daily updates, presses "Daily updates on" once today's manual refresh is used. */
  manualUsed: {
    title: 'Next update in {time}',
    paragraphs: [
      'Your profile updates by itself every 24 hours. Today’s manual refresh is used.',
      'Need it sooner? Use your own GitHub token. It runs on your GitHub limits, not ours.',
    ],
    primary: 'Use my GitHub token',
    secondary: 'OK',
  },

  /** The owner presses "Daily updates on" while their badge alone keeps the profile on daily updates. */
  ownBadge: {
    title: 'Your badge keeps this on',
    paragraphs: [
      'Your GitRanks badge on GitHub keeps your profile on daily updates. We update it every 24 hours while the badge is there.',
      'Want a refresh now, too? Star our repo and start your own daily updates.',
    ],
    primary: 'Start daily updates',
    secondary: 'Close',
  },

  /** Anyone presses "Updates daily" on a profile its owner turned daily updates on for. */
  whyDailyOwner: {
    title: 'This profile updates every day',
    paragraphs: [
      '@{login} signed in and starred our repo. So we update this profile every 24 hours.',
      'Want the same for your profile?',
    ],
    primary: 'Get daily updates',
    secondary: 'Close',
  },

  /** Anyone presses "Updates daily" on a profile a GitRanks badge on GitHub keeps on daily updates. */
  whyDailyBadge: {
    title: 'This profile updates every day',
    paragraphs: [
      '@{login} has a GitRanks badge on GitHub. So we update this profile every 24 hours.',
      'Want the same? Add a badge to your GitHub profile.',
    ],
    primary: 'Make a badge',
    secondary: 'Close',
  },
} satisfies Record<string, RefreshMessage>;

export type RefreshDialogKind = keyof typeof REFRESH_MESSAGES;

export const REFRESH_LABELS = {
  /** The Refresh button while today's free refresh is unused: on the user's own profile, and on repository pages. */
  dailyAvailable: 'Refresh · 1 left',
  /** While the star check runs. */
  checking: 'Checking…',
  /** Someone else's profile that updates every day; a press says why. */
  updatesDaily: 'Updates daily',
  /** The owner's own profile while their daily updates are off. */
  startDaily: 'Start daily updates',
  /** The owner's own profile while on, with today's manual refresh unused. */
  refreshNow: 'Refresh now',
  /** The owner's own profile while on, with nothing to press for. */
  dailyOn: 'Daily updates on',
} as const;

/** The line under "Updates daily", before "Next update in {time}." */
export const DAILY_UPDATES_LINES = {
  byOwner: 'Turned on by @{login}.',
  byBadge: 'Has a GitRanks badge on GitHub.',
  /** The owner's own profile: under "Start daily updates", with no time after it. */
  ownerOff: 'Refreshes now, then every day for 7 days.',
  /** The same once today's manual refresh is used: the start fetches nothing now. */
  ownerOffUsed: 'Updates every day for 7 days, from your next update.',
  /** The owner's own profile: under "Refresh now". */
  ownerOn: 'Daily updates on.',
  /** The owner's own profile, on by their badge alone. */
  ownerBadge: 'Your badge on GitHub keeps this on.',
} as const;

export const REFRESH_TOASTS = {
  started: 'Thanks for the star! ⭐ Refreshing your profile now.',
  /** "Start daily updates" found the star and refreshes the profile now. */
  updatesStarted: 'Thanks for the star! Refreshing now. Daily updates are on for 7 days.',
  /** "Start daily updates" found the star; today's manual refresh was used, so nothing is fetched now. */
  updatesStartedNoRefresh: 'Thanks for the star! Daily updates are on for 7 days.',
  checkFailed: 'GitHub didn’t answer. Please try again in a minute.',
  /** Another tab is checking the star right now. */
  busy: 'We are already checking. Try again in a moment.',
  /** The account's data was removed at its owner's request (410): GitRanks doesn't fetch it again. */
  removed: 'This account’s data was removed from GitRanks at its owner’s request.',
} as const;

/** A starrer back after their 7 days ran out: the visit started daily updates again. Stays until closed. */
export const WELCOME_BACK = {
  title: 'Welcome back',
  text: 'Daily updates stopped after 7 days without a visit. They are on again, and your profile is refreshing now.',
} as const;

/** The deal without its badge check: opened where the profile on screen is not the visitor's own. */
export const withoutBadgeCheck = (message: RefreshMessage): RefreshMessage => ({
  ...message,
  note: message.note?.replace(` ${CHECK_BADGE_SENTENCE}`, ''),
  noteLinks: message.noteLinks?.filter((link) => link.text !== CHECK_BADGE_LINK),
});

export const fillTime = (text: string, time?: string) => (time ? text.replaceAll('{time}', time) : text);

export const fillLogin = (text: string, login: string) => text.replaceAll('{login}', login);

/** The message with `{login}` filled in its paragraphs. */
export const withLogin = (message: RefreshMessage, login: string): RefreshMessage => ({
  ...message,
  paragraphs: message.paragraphs.map((paragraph) => fillLogin(paragraph, login)),
});
