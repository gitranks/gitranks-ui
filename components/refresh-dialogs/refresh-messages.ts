/**
 * Every word the Refresh button says, in one place, so the copy can be read and changed without the code.
 * Plain words and short sentences on purpose: many readers are not native English speakers. `{time}` is filled with
 * the time left, like "13 h 20 min".
 */

export const MAKER = {
  name: 'Vitalii',
  avatarUrl: 'https://avatars.githubusercontent.com/u/3485490?v=4',
} as const;

export const STAR_REPO_URL = 'https://github.com/gitranks/gitranks-ui';
export const GITHUB_AUTHORIZATIONS_URL = 'https://github.com/settings/apps/authorizations';

export type RefreshMessage = {
  title: string;
  paragraphs: string[];
  /** A numbered list after the paragraphs. */
  steps?: string[];
  /** Paragraphs after the steps. */
  closing?: string[];
  /** Small print after the steps. `noteLink` inside it becomes a link. */
  note?: string;
  noteLink?: { text: string; href: string };
  /** Signed under the text; the photo is always at the top. */
  signature?: string;
  primary: string;
  secondary: string;
};

const TOKEN_NOTE = {
  note: 'GitHub will say we can “act on your behalf”. We only read GitHub data to build stats. You can remove access any time in GitHub settings.',
  noteLink: { text: 'GitHub settings', href: GITHUB_AUTHORIZATIONS_URL },
};

export const REFRESH_MESSAGES = {
  /** Not signed in, presses Refresh. */
  signIn: {
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

  /** Signed in, own profile, the check found no star. */
  needStar: {
    title: 'Your refresh costs 1 star ⭐',
    paragraphs: [
      'That’s the full price. No card, no ads.',
      'Star our repo on GitHub, then press the button. Stars keep GitRanks alive.',
    ],
    signature: '— Vitalii',
    primary: '⭐ Star on GitHub',
    secondary: 'I starred it, refresh',
  },

  /** Signed in, own profile, today's refresh is used. */
  used: {
    title: 'Easy, tiger 🐯',
    paragraphs: [
      'Your next refresh is in {time}.',
      'Too long? Use your own GitHub token and refresh any profile, any time. It runs on your GitHub limits, not ours, so there is no daily cap.',
    ],
    ...TOKEN_NOTE,
    signature: '— Vitalii',
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
    signature: '— Vitalii',
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
} satisfies Record<string, RefreshMessage>;

export type RefreshDialogKind = keyof typeof REFRESH_MESSAGES;

export const REFRESH_LABELS = {
  /** The button on the user's own profile while today's refresh is unused. */
  dailyAvailable: 'Refresh · 1 left',
  /** While the star check runs. */
  checking: 'Checking…',
} as const;

export const REFRESH_TOASTS = {
  started: 'Thanks for the star! ⭐ Refreshing your profile now.',
  checkFailed: 'GitHub didn’t answer. Please try again in a minute.',
} as const;

export const fillTime = (text: string, time?: string) => (time ? text.replaceAll('{time}', time) : text);
