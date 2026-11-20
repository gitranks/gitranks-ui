import type { FollowSubscriber, PackageFollow } from '../follow-links.types';

/** Tokens of a stored token's shape: 43 base64url characters, as 32 random bytes are written. */
export const FOLLOW_TOKEN = 'fOlLoW_tOkEn-0123456789abcdefghijklmnopqrstu';
export const MANAGE_TOKEN = 'mAnAgE_tOkEn-0123456789abcdefghijklmnopqrstu';

export const RESIZE = { registry: 'npm', name: 'react-resize-detector' };
export const DIALOG = { registry: 'npm', name: '@radix-ui/react-dialog' };

export const followOf = (overrides: Partial<PackageFollow> = {}): PackageFollow => ({
  id: '6650a1b2c3d4e5f6a7b8c9d0',
  channel: 'EMAIL',
  status: 'ACTIVE',
  package: RESIZE,
  events: { notable: true, digest: true, milestones: false },
  ...overrides,
});

export const subscriberOf = (overrides: Partial<FollowSubscriber> = {}): FollowSubscriber => ({
  id: '6650a1b2c3d4e5f6a7b8c9aa',
  channel: 'EMAIL',
  addressHint: 'm•••@gmail.com',
  paused: false,
  follows: [
    followOf(),
    followOf({
      id: '6650a1b2c3d4e5f6a7b8c9d1',
      package: DIALOG,
      events: { notable: false, digest: true, milestones: true },
    }),
  ],
  ...overrides,
});
