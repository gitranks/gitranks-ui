import 'server-only';

import { settingsPageOf, unfollowPageOf } from './follow-links.data';
import { type LinkTrouble, type SettingsState, TIMED_OUT, UNKNOWN, type UnfollowState } from './follow-pages';
import { heroLinkPageOf } from './hero-links.data';
import type { HeroLinkState } from './hero-pages';
import { readLinkToken } from './link-cookie';

/*
 * What each page a link opens shows on load. A load only reads: it never unfollows, opts out or changes
 * anything, as mail scanners open links too. Without the link's cookie the page asks nothing: it says the link does not
 * work when the landing found no usable token in it (`invalid`), and that it has timed out otherwise.
 */

/** A page opened without its cookie. */
const noCookie = (invalid: boolean): LinkTrouble => (invalid ? UNKNOWN : TIMED_OUT);

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

/** `/hero-link/preview`: the week the link names, to show its card and archive block. */
export async function heroPreviewPageState(invalid = false): Promise<HeroLinkState> {
  const token = await readLinkToken('hero-preview');
  return token ? heroLinkPageOf(token) : noCookie(invalid);
}

/** `/hero-link/opt-out`: the week the press would opt out of. */
export async function heroOptOutPageState(invalid = false): Promise<HeroLinkState> {
  const token = await readLinkToken('hero-opt-out');
  return token ? heroLinkPageOf(token) : noCookie(invalid);
}
