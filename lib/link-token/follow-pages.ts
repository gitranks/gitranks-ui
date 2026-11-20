import type {
  FollowChangeByTokenAnswer,
  FollowChannel,
  FollowEvents,
  FollowPackage,
  FollowSubscriber,
  PackageFollow,
} from './follow-links.types';
import { DEFAULT_REGISTRY } from '@/lib/packages/registries';

/**
 * What a link's page can show when it cannot show its follows: the link's cookie is gone (`timed-out`), following
 * cannot be reached now (`unavailable`), or the token reaches nothing (`unknown`).
 */
export type LinkTrouble = { kind: 'timed-out' } | { kind: 'unavailable' } | { kind: 'unknown' };

export const TIMED_OUT = { kind: 'timed-out' } as const satisfies LinkTrouble;
export const UNAVAILABLE = { kind: 'unavailable' } as const satisfies LinkTrouble;
export const UNKNOWN = { kind: 'unknown' } as const satisfies LinkTrouble;

/**
 * What the last press on `/follow/unfollow` did, when the follow alone does not say it: Undo followed it again
 * (`undone`), or Undo was refused and it stays unfollowed (`undo-refused`).
 */
export type UnfollowNote = 'undone' | 'undo-refused';

/** `/follow/unfollow`: the link's one follow, at its address. */
export type UnfollowState =
  | LinkTrouble
  | { kind: 'follow'; follow: PackageFollow; addressHint: string; note?: UnfollowNote };

/**
 * What the last press on `/following` did, when the list alone does not say it. `channel` names where a resume or a
 * refused Undo happened, so a chat is not called an address. `link-gone`: a signed-in viewer's own list, shown because
 * the link they opened no longer works. `sign-in`: the session ended, so nothing can change until they sign in again.
 */
export type SettingsNotice =
  | { kind: 'stopped'; count: number }
  | { kind: 'resumed'; channel?: FollowChannel }
  | { kind: 'undo-refused'; package: FollowPackage; channel?: FollowChannel }
  | { kind: 'link-gone' }
  | { kind: 'sign-in' }
  | { kind: 'failed' };

/** `/following`: every follow of the address, by its settings link. */
export type SettingsState = LinkTrouble | { kind: 'list'; subscribers: FollowSubscriber[]; notice?: SettingsNotice };

/** The Unfollow page from what its link reaches: one follow at one address, or nothing. */
export function unfollowStateOf(subscribers: FollowSubscriber[]): UnfollowState {
  const subscriber = subscribers.find((each) => each.follows.length);
  const follow = subscriber?.follows[0];
  if (!subscriber || !follow) return UNKNOWN;
  return { kind: 'follow', follow, addressHint: subscriber.addressHint };
}

/**
 * The Unfollow page after a press, from the follow as the change answered it. A change that reached no follow is a link
 * that no longer works. An Undo answered still unfollowed was refused.
 */
export function unfollowStateAfter(
  previous: Extract<UnfollowState, { kind: 'follow' }>,
  change: 'remove' | 'undo',
  answer: FollowChangeByTokenAnswer,
): UnfollowState {
  const { follow } = answer;
  if (!follow) return UNKNOWN;
  const base = { kind: 'follow', follow, addressHint: previous.addressHint } as const;
  return change === 'undo' ? { ...base, note: follow.status === 'REMOVED' ? 'undo-refused' : 'undone' } : base;
}

/**
 * What a change on the settings page says, from its answer: `failed` when it reached nothing, `undo-refused` when an
 * Undo was answered still unfollowed, `done` (if any) otherwise.
 */
export function settingsNoticeAfter(
  change: { undo?: boolean; resumeSubscriberId?: string },
  answer: FollowChangeByTokenAnswer,
  done?: SettingsNotice,
): SettingsNotice | undefined {
  if (change.resumeSubscriberId) return answer.subscriber ? done : { kind: 'failed' };
  if (!answer.follow) return { kind: 'failed' };
  if (change.undo && answer.follow.status === 'REMOVED')
    return { kind: 'undo-refused', package: answer.follow.package, channel: answer.follow.channel };
  return done;
}

/** The settings page from what its link reaches; no address at all is a link that reaches nothing. */
export function settingsStateOf(subscribers: FollowSubscriber[], notice?: SettingsNotice): SettingsState {
  if (!subscribers.length) return UNKNOWN;
  return { kind: 'list', subscribers, ...(notice ? { notice } : {}) };
}

/** A package's name as people know it: the name alone on the default registry, `<registry>/<name>` on another. */
export const packageLabelOf = ({ registry, name }: FollowPackage) =>
  !registry || registry.toLowerCase() === DEFAULT_REGISTRY ? name : `${registry}/${name}`;

/** "react-resize-detector", "react and vue", "react, vue and 3 more". */
export function packagesLabelOf(packages: FollowPackage[]): string {
  const names = packages.map(packageLabelOf);
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

/** The three switches, in the order the emails name them, with what each one sends. */
export const FOLLOW_EVENT_LINES: { key: keyof FollowEvents; line: string; label: string }[] = [
  { key: 'notable', line: 'when a repository with 1,000+ stars starts using it', label: 'New 1,000+ star users' },
  { key: 'digest', line: 'a monthly digest of downloads and dependents', label: 'Monthly digest' },
  { key: 'milestones', line: 'milestones, like its first 10 million downloads in a month', label: 'Milestones' },
];

/** Whether `value` is a follow's three switches, as a press sends them. */
export const isFollowEvents = (value: unknown): value is FollowEvents =>
  !!value &&
  typeof value === 'object' &&
  FOLLOW_EVENT_LINES.every(({ key }) => typeof (value as Record<string, unknown>)[key] === 'boolean');

/** An id a page was given: a follow's or an address's. Anything else reaches nothing and is not sent. */
export const isFollowId = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value);
