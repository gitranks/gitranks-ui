'use server';

import { pressConfirm } from '@/lib/link-token/follow-links.data';
import { type ConfirmState, confirmStateOfPress, TIMED_OUT, UNAVAILABLE } from '@/lib/link-token/follow-pages';
import { keepLinkToken, readLinkToken } from '@/lib/link-token/link-cookie';

/**
 * The confirmation page's one button. The token comes from the link's cookie, never from the browser's form. The
 * first press of a link answers the address's settings key: it is kept in the settings cookie, never shown, so the
 * page's link to `/following` opens the address's list.
 */
export async function confirmFollow(_previous: ConfirmState): Promise<ConfirmState> {
  const token = await readLinkToken('confirm');
  if (!token) return TIMED_OUT;
  const answer = await pressConfirm(token);
  if (!answer) return UNAVAILABLE;
  await keepLinkToken('confirm', token);
  const settings = answer.result === 'CONFIRMED' && !!answer.manageToken;
  if (settings && answer.manageToken) await keepLinkToken('settings', answer.manageToken);
  return confirmStateOfPress(answer, settings);
}
