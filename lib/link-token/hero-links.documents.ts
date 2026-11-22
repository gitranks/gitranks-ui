import { parse } from 'graphql';

import type DocumentNode from '@/types/typed-document-node';

/**
 * The operations of the two pages an Unsung hero heads-up links to, written out here rather than in `.gql` files: the
 * fields are newer than the generated schema. Each is keyed by the link's token alone and asked only by the site's
 * server. None asks for an address: the answers hold none.
 */
const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

/** Where the week a link names stands. */
export type ApiHeroLinkState = 'UPCOMING' | 'LIVE' | 'DONE' | 'OPTED_OUT' | 'CANCELLED';

/** What a press on the opt-out page did. */
export type ApiHeroLinkResult =
  | 'OPTED_OUT'
  | 'ALREADY_OPTED_OUT'
  | 'NOT_POSSIBLE'
  | 'RESTORED'
  | 'UNDONE'
  | 'WEEK_TAKEN'
  | 'EXPIRED'
  | 'NOT_OPTED_OUT'
  | 'UNKNOWN';

/** The week a link names, as the API answers it. Dates are ISO strings. */
export type ApiHeroLink = {
  state: ApiHeroLinkState;
  startsAt: string;
  endsAt: string;
  repo: { nameWithOwner: string; description: string | null; createdAt: string | null };
  package: { registry: string; name: string };
  maintainer: { login: string; name: string | null };
  line: string;
  text: string;
  facts: { weeklyDownloads: number; contributors: number | null };
  stars: number | null;
  starsAtStart: number | null;
  canOptOut: boolean;
  undoUntil: string | null;
};

export type ApiHeroLinkAnswer = { result: ApiHeroLinkResult; link: ApiHeroLink | null };

const LINK_FIELDS = `state startsAt endsAt
  repo { nameWithOwner description createdAt }
  package { registry name }
  maintainer { login name }
  line text
  facts { weeklyDownloads contributors }
  stars starsAtStart canOptOut undoUntil`;

/** The week a link names; null for a token no week has. Changes nothing. */
export const UnsungHeroLinkDocument = doc<{ unsungHeroLink: ApiHeroLink | null }, { token: string }>(
  `query UnsungHeroLink($token: String!) {
    unsungHeroLink(token: $token) { ${LINK_FIELDS} }
  }`,
);

/** The opt-out page's button. */
export const UnsungHeroOptOutDocument = doc<{ unsungHeroOptOut: ApiHeroLinkAnswer }, { token: string }>(
  `mutation UnsungHeroOptOut($token: String!) {
    unsungHeroOptOut(token: $token) { result link { ${LINK_FIELDS} } }
  }`,
);

/** The opt-out page's Undo, for 7 days. */
export const UnsungHeroOptOutUndoDocument = doc<{ unsungHeroOptOutUndo: ApiHeroLinkAnswer }, { token: string }>(
  `mutation UnsungHeroOptOutUndo($token: String!) {
    unsungHeroOptOutUndo(token: $token) { result link { ${LINK_FIELDS} } }
  }`,
);
