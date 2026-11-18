import 'server-only';

import { peekConfirm, settingsPageOf, unfollowPageOf } from './follow-links.data';
import {
  type ConfirmState,
  type LinkTrouble,
  type SettingsState,
  TIMED_OUT,
  UNKNOWN,
  type UnfollowState,
} from './follow-pages';
import { readLinkToken } from './link-cookie';

/*
 * What each page a link opens shows on load. A load only reads: it never confirms, unfollows or changes anything, as
 * mail scanners open links too. Without the link's cookie the page asks nothing: it says the link does not work when
 * the landing found no usable token in it (`invalid`), and that it has timed out otherwise.
 */

/** A page opened without its cookie. */
const noCookie = (invalid: boolean): LinkTrouble => (invalid ? UNKNOWN : TIMED_OUT);

/** `/follow/confirm`: what the press would confirm. */
export async function confirmPageState(invalid = false): Promise<ConfirmState> {
  const token = await readLinkToken('confirm');
  return token ? peekConfirm(token) : noCookie(invalid);
}

/** `/follow/unfollow`: the link's follow. */
export async function unfollowPageState(invalid = false): Promise<UnfollowState> {
  const token = await readLinkToken('unfollow');
  return token ? unfollowPageOf(token) : noCookie(invalid);
}

/** `/following`: every follow of the link's address. */
export async function settingsPageState(invalid = false): Promise<SettingsState> {
  const token = await readLinkToken('settings');
  return token ? settingsPageOf(token) : noCookie(invalid);
}
