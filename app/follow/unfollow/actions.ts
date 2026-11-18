'use server';

import { changeByFollowToken } from '@/lib/link-token/follow-links.data';
import { TIMED_OUT, type UnfollowState } from '@/lib/link-token/follow-pages';
import { keepLinkToken, readLinkToken } from '@/lib/link-token/link-cookie';

/**
 * The Unfollow page's buttons: `remove` unfollows the link's follow, `undo` follows it again (for 7 days after). The
 * token comes from the link's cookie; the form says only which button was pressed.
 */
export async function changeFollow(previous: UnfollowState, form: FormData): Promise<UnfollowState> {
  const change = form.get('change');
  if ((change !== 'remove' && change !== 'undo') || previous.kind !== 'follow') return previous;
  const token = await readLinkToken('unfollow');
  if (!token) return TIMED_OUT;
  await keepLinkToken('unfollow', token);
  return changeByFollowToken(token, change, previous);
}
