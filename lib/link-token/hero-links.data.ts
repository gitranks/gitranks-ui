import 'server-only';

import { UNAVAILABLE } from './follow-pages';
import { UnsungHeroLinkDocument, UnsungHeroOptOutDocument, UnsungHeroOptOutUndoDocument } from './hero-links.documents';
import { type HeroLinkState, heroStateAfter, heroStateOf } from './hero-pages';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type DocumentNode from '@/types/typed-document-node';

/*
 * The reads and presses of the two pages an Unsung hero heads-up links to, each keyed by the link's token alone and
 * asked from the site's server only. A failure answers `unavailable`, never an error: nothing here is logged, so no
 * token is.
 */

const ask = <TData>(document: DocumentNode<TData, { token: string }>, token: string) =>
  graphqlDirect(document, { token }, { source: 'ssr' });

/** The week the link names. Changes nothing. */
export async function heroLinkPageOf(token: string): Promise<HeroLinkState> {
  try {
    return heroStateOf((await ask(UnsungHeroLinkDocument, token)).unsungHeroLink);
  } catch {
    return UNAVAILABLE;
  }
}

/** The opt-out page's button: opts the link's week out, and answers the page as it now is. */
export async function optOutByHeroLink(token: string): Promise<HeroLinkState> {
  try {
    return heroStateAfter((await ask(UnsungHeroOptOutDocument, token)).unsungHeroOptOut);
  } catch {
    return UNAVAILABLE;
  }
}

/** The opt-out page's Undo: takes the opt-out back, and answers the page as it now is. */
export async function undoByHeroLink(token: string): Promise<HeroLinkState> {
  try {
    return heroStateAfter((await ask(UnsungHeroOptOutUndoDocument, token)).unsungHeroOptOutUndo);
  } catch {
    return UNAVAILABLE;
  }
}
