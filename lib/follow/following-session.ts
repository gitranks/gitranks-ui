import 'server-only';

import type { FollowingChangeVariables } from './follow.documents';
import { changeFollowing, type FollowCaller, readFollowing, stopAllFollowing } from './follow-api';
import {
  isFollowEvents,
  isFollowId,
  type SettingsNotice,
  type SettingsState,
  settingsNoticeAfter,
  UNAVAILABLE,
} from '@/lib/link-token/follow-pages';
import { settingsPageState } from '@/lib/link-token/link-pages';

/*
 * `/following` for a signed-in viewer who came without an email settings link: every address of their account (email,
 * Telegram, WhatsApp) with its package follows, read and changed by the session alone. No link key is involved.
 */

/** A press on the signed-in settings page, as the browser sends it. */
export type FollowingPress =
  | { action: 'events'; followId: string; events: { notable: boolean; digest: boolean; milestones: boolean } }
  | { action: 'remove' | 'undo'; followId: string }
  | { action: 'resume'; subscriberId: string }
  | { action: 'stop-all' };

/** A press from the browser's body; null for anything else. */
export function followingPressOf(value: unknown): FollowingPress | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  switch (body.action) {
    case 'events': {
      if (!isFollowId(body.followId) || !isFollowEvents(body.events)) return null;
      const { notable, digest, milestones } = body.events;
      return { action: 'events', followId: body.followId, events: { notable, digest, milestones } };
    }
    case 'remove':
    case 'undo':
      return isFollowId(body.followId) ? { action: body.action, followId: body.followId } : null;
    case 'resume':
      return isFollowId(body.subscriberId) ? { action: 'resume', subscriberId: body.subscriberId } : null;
    case 'stop-all':
      return { action: 'stop-all' };
    default:
      return null;
  }
}

/**
 * The signed-in viewer's settings page, with `notice` from the last press; null when nobody is signed in or the
 * feature is closed to them (the page then shows what it did before).
 */
export async function sessionSettingsState(
  caller: FollowCaller,
  notice?: SettingsNotice,
): Promise<SettingsState | null> {
  if (!caller.githubLogin) return null;
  const answer = await readFollowing(caller);
  if (answer.ok) return { kind: 'list', subscribers: answer.data, ...(notice ? { notice } : {}) };
  return answer.failure === 'not_found' || answer.failure === 'sign_in' ? null : UNAVAILABLE;
}

const changeOf = (press: Exclude<FollowingPress, { action: 'stop-all' }>): FollowingChangeVariables => {
  switch (press.action) {
    case 'events':
      return { followId: press.followId, events: press.events };
    case 'resume':
      return { resumeSubscriberId: press.subscriberId };
    default:
      return { followId: press.followId, [press.action]: true };
  }
};

/**
 * One press on the signed-in settings page, then the page as it now is: `failed` when the change did not go through,
 * `undo-refused` when an Undo was answered still unfollowed. Null when nobody is signed in or the feature is closed.
 */
export async function pressSessionSettings(caller: FollowCaller, press: FollowingPress): Promise<SettingsState | null> {
  if (!caller.githubLogin) return null;
  let notice: SettingsNotice | undefined;
  if (press.action === 'stop-all') {
    const removed = await stopAllFollowing(caller);
    notice = removed.ok ? { kind: 'stopped', count: removed.data } : { kind: 'failed' };
  } else {
    const change = changeOf(press);
    const answer = await changeFollowing(caller, change);
    notice = answer.ok
      ? settingsNoticeAfter(change, answer.data, press.action === 'resume' ? { kind: 'resumed' } : undefined)
      : { kind: 'failed' };
  }
  return sessionSettingsState(caller, notice);
}

/**
 * What `/following` shows on load: by the email settings link this browser holds, as before; without one, a signed-in
 * viewer's own list (`session`); otherwise what the link pages say without their cookie. A link that held no usable
 * token (`invalid`) still says so, signed in or not.
 */
export async function followingPageOf(
  invalid: boolean,
  caller: () => Promise<FollowCaller>,
): Promise<{ state: SettingsState; session: boolean }> {
  const state = await settingsPageState(invalid);
  if (state.kind !== 'timed-out') return { state, session: false };
  const own = await sessionSettingsState(await caller());
  return own ? { state: own, session: true } : { state, session: false };
}
