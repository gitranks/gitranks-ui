'use server';

import { changeBySettings, settingsPageOf, stopAllBySettings } from '@/lib/link-token/follow-links.data';
import type { FollowEvents } from '@/lib/link-token/follow-links.types';
import { isFollowEvents, isFollowId, type SettingsState, TIMED_OUT } from '@/lib/link-token/follow-pages';
import { keepLinkToken, readLinkToken } from '@/lib/link-token/link-cookie';

/*
 * The settings page's buttons, each a press of its own. The token comes from the link's settings cookie, never from
 * the browser; each press renews it and answers the page as it now is.
 */

/** The settings key of the link, renewed; null once it ran out. */
async function settingsToken(): Promise<string | null> {
  const token = await readLinkToken('settings');
  if (token) await keepLinkToken('settings', token);
  return token;
}

/** Sets a follow's three switches. */
export async function setFollowEvents(followId: string, events: FollowEvents): Promise<SettingsState> {
  const token = await settingsToken();
  if (!token) return TIMED_OUT;
  if (!isFollowId(followId) || !isFollowEvents(events)) return settingsPageOf(token, { kind: 'failed' });
  const { notable, digest, milestones } = events;
  return changeBySettings(token, { followId, events: { notable, digest, milestones } });
}

/** Unfollows a package (`remove`), or follows it again within its 7 days (`undo`). */
export async function changeFollowing(followId: string, change: 'remove' | 'undo'): Promise<SettingsState> {
  const token = await settingsToken();
  if (!token) return TIMED_OUT;
  if (!isFollowId(followId) || (change !== 'remove' && change !== 'undo')) {
    return settingsPageOf(token, { kind: 'failed' });
  }
  return changeBySettings(token, { followId, [change]: true });
}

/** Sends to a paused address again. */
export async function resumeAddress(subscriberId: string): Promise<SettingsState> {
  const token = await settingsToken();
  if (!token) return TIMED_OUT;
  if (!isFollowId(subscriberId)) return settingsPageOf(token, { kind: 'failed' });
  return changeBySettings(token, { resumeSubscriberId: subscriberId }, { kind: 'resumed' });
}

/** "Stop all package email": unfollows every package of the address. */
export async function stopAllEmail(): Promise<SettingsState> {
  const token = await settingsToken();
  if (!token) return TIMED_OUT;
  return stopAllBySettings(token);
}
