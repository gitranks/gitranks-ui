import type { Session } from 'next-auth';

import {
  fillTime,
  REFRESH_LABELS,
  REFRESH_MESSAGES,
  REFRESH_TOASTS,
  type RefreshMessage,
  TOKEN_NOTE,
} from '@/components/refresh-dialogs/refresh-messages';
import type { RepoPullAllowance, RepoPullResult, RepoPullStatus } from '@/types/repo-pull.types';
import { timeLeftUntil } from '@/utils/format-time-left';

/** Fetches a day for a visitor signed in with their own token, when the answer does not say. */
export const TOKEN_PULLS_PER_DAY = 20;

/**
 * Who presses Refresh on a repository page: `daily` signed in without a token (one free fetch a day for a star), `token`
 * signed in with their own token. While the session is `loading`, a press does nothing.
 */
export type PullMode = 'loading' | 'signed-out' | 'token' | 'daily';

export function pullModeOf(
  session: Session | null | undefined,
  status: 'loading' | 'authenticated' | 'unauthenticated',
): PullMode {
  if (status === 'loading') {
    return 'loading';
  }
  if (!session?.user?.githubLogin) {
    return 'signed-out';
  }
  return session.user.authMode === 'token' ? 'token' : 'daily';
}

export const PULL_MESSAGES = {
  signIn: {
    photo: true,
    title: 'Hi, I’m Vitalii 👋',
    paragraphs: [
      'I made GitRanks. Reading a star history takes many GitHub requests, and our GitHub limits are small.',
      'So here is the deal:',
    ],
    steps: [
      'Sign in with GitHub. We only see your name and email.',
      'Star our repo.',
      'Get 1 star history fetch every day.',
    ],
    closing: [`Need more? Later you can use your own GitHub token for up to ${TOKEN_PULLS_PER_DAY} fetches a day.`],
    primary: 'Sign in with GitHub',
    secondary: 'Maybe later',
  },
  needStar: {
    photo: true,
    title: 'This fetch costs 1 star ⭐',
    paragraphs: [
      'Star our repo gitranks/gitranks-ui on GitHub to unlock one free star history fetch a day.',
      'That’s the full price. No card, no ads. Then press the button again.',
    ],
    signature: '— Vitalii',
    primary: '⭐ Star on GitHub',
    secondary: 'I starred it, fetch',
  },
  used: {
    title: 'Easy, tiger 🐯',
    paragraphs: [
      'Your free fetch of today is used. The next one is in {time}.',
      `Too long? Use your own GitHub token for up to ${TOKEN_PULLS_PER_DAY} fetches a day. They run on your GitHub limits, not ours.`,
    ],
    ...TOKEN_NOTE,
    primary: 'Use my GitHub token',
    secondary: 'I’ll wait',
  },
  blocked: REFRESH_MESSAGES.blocked,
} satisfies Record<string, RefreshMessage>;

export type PullDialogKind = keyof typeof PULL_MESSAGES;

export const PULL_TOASTS = {
  startedDaily: 'Thanks for the star! ⭐ Fetching the star history now.',
  started: 'Fetching the star history now.',
  notEligible: 'A star history is not available for this repository.',
  upToDate: 'The star history is already up to date.',
  notReady: 'The star history was fetched lately. The next fetch opens in {time}.',
  quota: 'You used all your fetches of today. The next one is in {time}.',
  busy: REFRESH_TOASTS.busy,
  refused: 'This fetch is not allowed.',
  invalid: 'This repository name is not valid.',
  failed: REFRESH_TOASTS.checkFailed,
  pullFailed: 'The star history fetch failed. Please try again later.',
  timedOut: 'The fetch is taking long. Come back later: the chart updates when it is done.',
} as const;

/** What the button does next: wait for the fetch, open a dialog or show a toast. */
export type PullOutcome =
  | { kind: 'poll'; toast?: string }
  | { kind: 'dialog'; dialog: PullDialogKind; until?: string }
  | { kind: 'toast'; tone: 'info' | 'error'; text: string };

const info = (text: string): PullOutcome => ({ kind: 'toast', tone: 'info', text });

export function pullOutcomeOf(result: RepoPullResult, mode: PullMode, now = Date.now()): PullOutcome {
  switch (result.status) {
    case 'started':
      return { kind: 'poll', toast: mode === 'daily' ? PULL_TOASTS.startedDaily : PULL_TOASTS.started };
    case 'running':
      return { kind: 'poll' };
    case 'not_eligible':
      return info(PULL_TOASTS.notEligible);
    case 'up_to_date':
      return info(PULL_TOASTS.upToDate);
    case 'not_ready':
      return info(fillTime(PULL_TOASTS.notReady, timeLeftUntil(result.until, now)));
    case 'used':
      return { kind: 'dialog', dialog: 'used', until: result.nextAt };
    case 'blocked':
      return { kind: 'dialog', dialog: 'blocked', until: result.until };
    case 'not_starred':
      return { kind: 'dialog', dialog: 'needStar' };
    case 'busy':
      return info(PULL_TOASTS.busy);
    case 'quota':
      return info(fillTime(PULL_TOASTS.quota, timeLeftUntil(result.nextAt, now)));
  }
}

/** What a status check while waiting leads to: wait more, stop, stop with an error, or reload the page. */
export type PullCheck = 'continue' | 'stop' | 'stopFailed' | 'reload';

/**
 * The next step after a status check. `pullId` is the fetch this visitor started, when known: an answer about
 * another fetch is not the end of this one.
 */
export function pullCheckOf(status: RepoPullStatus | null | undefined, pullId: string | null): PullCheck {
  if (!status) {
    return 'continue';
  }

  const { pull } = status;
  if (!pull) {
    return 'stop';
  }
  if ((pullId && pull.id !== pullId) || pull.status === 'running') {
    return 'continue';
  }

  return pull.status === 'failed' ? 'stopFailed' : 'reload';
}

/** The allowance after a press started a fetch: a daily visitor's free fetch is used until `nextAt`. */
export function allowanceAfter(
  result: RepoPullResult,
  mode: PullMode,
  allowance: RepoPullAllowance | null,
): RepoPullAllowance | null {
  if (result.status !== 'started' || mode !== 'daily' || !result.nextAt) {
    return allowance;
  }

  return {
    daily: { available: false, nextAt: result.nextAt },
    token: allowance?.token ?? { used: 0, limit: TOKEN_PULLS_PER_DAY, nextAt: null },
  };
}

/** A refused press, by its HTTP status. */
export function pullErrorOutcomeOf(httpStatus: number): PullOutcome {
  switch (httpStatus) {
    case 401:
      return { kind: 'dialog', dialog: 'signIn' };
    case 403:
      return { kind: 'toast', tone: 'error', text: PULL_TOASTS.refused };
    case 400:
      return { kind: 'toast', tone: 'error', text: PULL_TOASTS.invalid };
    default:
      return { kind: 'toast', tone: 'error', text: PULL_TOASTS.failed };
  }
}

/** The button's label: like the profile's Refresh, with the fetches left today when the allowance is known. */
export function pullLabelOf(mode: PullMode, allowance: RepoPullAllowance | null | undefined) {
  if (mode === 'daily' && allowance?.daily.available) {
    return REFRESH_LABELS.dailyAvailable;
  }
  if (mode === 'token' && allowance) {
    const { used, limit } = allowance.token;
    return `Refresh · ${Math.max(0, limit - used)} left`;
  }

  return 'Refresh';
}
