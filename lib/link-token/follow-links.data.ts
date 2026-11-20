import 'server-only';

import {
  FollowChangeByTokenDocument,
  type FollowChangeByTokenVariables,
  FollowingByTokenDocument,
  FollowStopAllByTokenDocument,
} from './follow-links.documents';
import type { FollowChangeByTokenAnswer, FollowSubscriber } from './follow-links.types';
import {
  type SettingsNotice,
  type SettingsState,
  settingsNoticeAfter,
  settingsStateOf,
  UNAVAILABLE,
  type UnfollowState,
  unfollowStateAfter,
  unfollowStateOf,
} from './follow-pages';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type DocumentNode from '@/types/typed-document-node';

/*
 * The reads and changes of the pages a follower's email links to, each keyed by the link's token alone and asked from
 * the site's server only. A failure answers `unavailable`, never an error: nothing here is logged, so no token is.
 */

const ask = <TData, TVariables extends Record<string, unknown>>(
  document: DocumentNode<TData, TVariables>,
  variables: TVariables,
) => graphqlDirect(document, variables, { source: 'ssr' });

type Asker = { manageToken: string } | { followToken: string };

async function listBy(asker: Asker): Promise<FollowSubscriber[] | null> {
  try {
    return (await ask(FollowingByTokenDocument, asker)).followingByToken;
  } catch {
    return null;
  }
}

/** A change by a link: the follow (or address) as it now is; null when following cannot be reached. */
async function changeBy(variables: FollowChangeByTokenVariables): Promise<FollowChangeByTokenAnswer | null> {
  try {
    return (await ask(FollowChangeByTokenDocument, variables)).followChangeByToken;
  } catch {
    return null;
  }
}

/** The Unfollow page: the link's follow. */
export async function unfollowPageOf(followToken: string): Promise<UnfollowState> {
  const subscribers = await listBy({ followToken });
  return subscribers ? unfollowStateOf(subscribers) : UNAVAILABLE;
}

/**
 * Unfollows (`remove`) or follows again (`undo`) the link's follow, and answers the page from the follow as the change
 * left it.
 */
export async function changeByFollowToken(
  followToken: string,
  change: 'remove' | 'undo',
  previous: Extract<UnfollowState, { kind: 'follow' }>,
): Promise<UnfollowState> {
  const answer = await changeBy({ followToken, [change]: true });
  return answer ? unfollowStateAfter(previous, change, answer) : UNAVAILABLE;
}

/** The settings page: every follow of the link's address. */
export async function settingsPageOf(manageToken: string, notice?: SettingsNotice): Promise<SettingsState> {
  const subscribers = await listBy({ manageToken });
  return subscribers ? settingsStateOf(subscribers, notice) : UNAVAILABLE;
}

/** A change on the settings page, and the page as it now is (with `failed` when the change did not go through). */
export async function changeBySettings(
  manageToken: string,
  change: Omit<FollowChangeByTokenVariables, 'manageToken' | 'followToken'>,
  done?: SettingsNotice,
): Promise<SettingsState> {
  const answer = await changeBy({ manageToken, ...change });
  return settingsPageOf(manageToken, answer ? settingsNoticeAfter(change, answer, done) : { kind: 'failed' });
}

/** "Stop all package email", and the page as it now is. */
export async function stopAllBySettings(manageToken: string): Promise<SettingsState> {
  let count: number;
  try {
    count = (await ask(FollowStopAllByTokenDocument, { manageToken })).followStopAllByToken;
  } catch {
    return settingsPageOf(manageToken, { kind: 'failed' });
  }
  return settingsPageOf(manageToken, { kind: 'stopped', count });
}
