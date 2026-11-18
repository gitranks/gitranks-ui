import 'server-only';

import { peekConfirm, settingsPageOf, unfollowPageOf } from './follow-links.data';
import { type ConfirmState, type SettingsState, TIMED_OUT, type UnfollowState } from './follow-pages';
import { readLinkToken } from './link-cookie';

/*
 * What each page a link opens shows on load. A load only reads: it never confirms, unfollows or changes anything, as
 * mail scanners open links too. Without the link's cookie the page says the link has timed out, and asks nothing.
 */

/** `/follow/confirm`: what the press would confirm. */
export async function confirmPageState(): Promise<ConfirmState> {
  const token = await readLinkToken('confirm');
  return token ? peekConfirm(token) : TIMED_OUT;
}

/** `/follow/unfollow`: the link's follow. */
export async function unfollowPageState(): Promise<UnfollowState> {
  const token = await readLinkToken('unfollow');
  return token ? unfollowPageOf(token) : TIMED_OUT;
}

/** `/following`: every follow of the link's address. */
export async function settingsPageState(): Promise<SettingsState> {
  const token = await readLinkToken('settings');
  return token ? settingsPageOf(token) : TIMED_OUT;
}
