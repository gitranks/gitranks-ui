import 'server-only';

import {
  FollowChangeByTokenDocument,
  type FollowChangeByTokenVariables,
  FollowConfirmDocument,
  FollowConfirmPeekDocument,
  FollowingByTokenDocument,
  FollowStopAllByTokenDocument,
} from './follow-links.documents';
import type { FollowConfirmAnswer, FollowSubscriber } from './follow-links.types';
import {
  type ConfirmState,
  confirmStateOfPeek,
  type SettingsNotice,
  type SettingsState,
  settingsStateOf,
  UNAVAILABLE,
  type UnfollowState,
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

/** What the confirmation link would confirm; changes nothing. */
export async function peekConfirm(token: string): Promise<ConfirmState> {
  try {
    const { followConfirmPeek } = await ask(FollowConfirmPeekDocument, { token });
    return confirmStateOfPeek(followConfirmPeek);
  } catch {
    return UNAVAILABLE;
  }
}

/** The confirmation's press; null when following cannot be reached. */
export async function pressConfirm(token: string): Promise<FollowConfirmAnswer | null> {
  try {
    return (await ask(FollowConfirmDocument, { token })).followConfirm;
  } catch {
    return null;
  }
}

type Asker = { manageToken: string } | { followToken: string };

async function listBy(asker: Asker): Promise<FollowSubscriber[] | null> {
  try {
    return (await ask(FollowingByTokenDocument, asker)).followingByToken;
  } catch {
    return null;
  }
}

/** A change by a link; false when following cannot be reached. */
async function changeBy(variables: FollowChangeByTokenVariables): Promise<boolean> {
  try {
    await ask(FollowChangeByTokenDocument, variables);
    return true;
  } catch {
    return false;
  }
}

/** The Unfollow page: the link's follow. */
export async function unfollowPageOf(followToken: string, undone = false): Promise<UnfollowState> {
  const subscribers = await listBy({ followToken });
  return subscribers ? unfollowStateOf(subscribers, undone) : UNAVAILABLE;
}

/** Unfollows (`remove`) or follows again (`undo`) the link's follow, and answers the page as it now is. */
export async function changeByFollowToken(followToken: string, change: 'remove' | 'undo'): Promise<UnfollowState> {
  if (!(await changeBy({ followToken, [change]: true }))) return UNAVAILABLE;
  return unfollowPageOf(followToken, change === 'undo');
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
  const changed = await changeBy({ manageToken, ...change });
  return settingsPageOf(manageToken, changed ? done : { kind: 'failed' });
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
