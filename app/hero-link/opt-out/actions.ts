'use server';

import { TIMED_OUT } from '@/lib/link-token/follow-pages';
import { optOutByHeroLink, undoByHeroLink } from '@/lib/link-token/hero-links.data';
import type { HeroLinkState } from '@/lib/link-token/hero-pages';
import { keepLinkToken, readLinkToken } from '@/lib/link-token/link-cookie';

/**
 * The opt-out page's buttons, the only way it changes anything: `opt-out` opts the link's week out, `undo` takes that
 * back (for 7 days after). A server action, so only a press (a POST) reaches it. The token comes from the link's
 * cookie; the form says only which button was pressed.
 */
export async function pressHeroOptOut(previous: HeroLinkState, form: FormData): Promise<HeroLinkState> {
  const change = form.get('change');
  if ((change !== 'opt-out' && change !== 'undo') || previous.kind !== 'link') return previous;
  const token = await readLinkToken('hero-opt-out');
  if (!token) return TIMED_OUT;
  await keepLinkToken('hero-opt-out', token);
  return change === 'undo' ? undoByHeroLink(token) : optOutByHeroLink(token);
}
