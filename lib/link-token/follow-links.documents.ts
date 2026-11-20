import { parse } from 'graphql';

import type { FollowChangeByTokenAnswer, FollowEvents, FollowSubscriber } from './follow-links.types';
import type DocumentNode from '@/types/typed-document-node';

/**
 * The operations of the pages a link in a follower's email opens, written out here rather than in `.gql` files: the
 * fields are newer than the generated schema. Each one is keyed by a link's token alone and asked only by the site's
 * server; none is on the browser's GraphQL allow-list.
 */
const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const FOLLOW_FIELDS = 'id channel status package { registry name } events { notable digest milestones }';
const SUBSCRIBER_FIELDS = `id channel addressHint paused follows { ${FOLLOW_FIELDS} }`;

/** The follows a settings link (its address's) or an Unfollow link (that follow alone) reaches. */
export const FollowingByTokenDocument = doc<
  { followingByToken: FollowSubscriber[] },
  { manageToken?: string; followToken?: string }
>(
  `query FollowingByToken($manageToken: String, $followToken: String) {
    followingByToken(manageToken: $manageToken, followToken: $followToken) { ${SUBSCRIBER_FIELDS} }
  }`,
);

export type FollowChangeByTokenVariables = {
  manageToken?: string;
  followToken?: string;
  followId?: string;
  events?: FollowEvents;
  remove?: boolean;
  undo?: boolean;
  resumeSubscriberId?: string;
};

/** A change by a link: a follow's switches, its Unfollow or its Undo, or sending to a paused address again. */
export const FollowChangeByTokenDocument = doc<
  { followChangeByToken: FollowChangeByTokenAnswer },
  FollowChangeByTokenVariables
>(
  `mutation FollowChangeByToken(
    $manageToken: String
    $followToken: String
    $followId: ID
    $events: FollowEventSwitchesInput
    $remove: Boolean
    $undo: Boolean
    $resumeSubscriberId: ID
  ) {
    followChangeByToken(
      manageToken: $manageToken
      followToken: $followToken
      followId: $followId
      events: $events
      remove: $remove
      undo: $undo
      resumeSubscriberId: $resumeSubscriberId
    ) {
      follow { ${FOLLOW_FIELDS} }
      subscriber { ${SUBSCRIBER_FIELDS} }
    }
  }`,
);

/** "Stop all package email": answers how many follows were removed. */
export const FollowStopAllByTokenDocument = doc<{ followStopAllByToken: number }, { manageToken: string }>(
  `mutation FollowStopAllByToken($manageToken: String!) {
    followStopAllByToken(manageToken: $manageToken)
  }`,
);
