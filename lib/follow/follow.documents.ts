import { parse } from 'graphql';

import type {
  PackageFollow as SettingsFollow,
  FollowSubscriber as SettingsSubscriber,
} from '@/lib/link-token/follow-links.types';
import type DocumentNode from '@/types/typed-document-node';

/**
 * Following packages, written out here rather than in `.gql` files, as the package pages' operations are: the fields
 * are newer than the generated schema, and an API that does not answer them yet fails only these operations. Enum
 * values come back in upper case (`EMAIL`, `PENDING`); `follow-api.ts` reads them in lower case.
 */
const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

type ApiPackage = { registry: string; name: string };
type ApiPackageInput = { registry: 'NPM'; name: string };
type ApiEvents = { notable: boolean; digest: boolean; milestones: boolean };

export type ApiFollow = { id: string; channel: string; package: ApiPackage; status: string; events: ApiEvents };

const FOLLOW_FIELDS = 'id channel package { registry name } status events { notable digest milestones }';

export const FollowChannelsDocument = doc<
  {
    packageFollowChannels: {
      channels: {
        channel: string;
        open: boolean;
        limit: number;
        linked: boolean | null;
        addressHint: string | null;
        rankUpdates: boolean | null;
      }[];
      dependents: number | null;
      notable: number | null;
    } | null;
  },
  { package: ApiPackageInput | null }
>(
  `query FollowChannels($package: FollowPackageInput) {
    packageFollowChannels(package: $package) {
      channels { channel open limit linked addressHint rankUpdates }
      dependents
      notable
    }
  }`,
);

export const FollowStateDocument = doc<{ packageFollow: ApiFollow[] | null }, { packages: ApiPackageInput[] }>(
  `query FollowState($packages: [FollowPackageInput!]!) {
    packageFollow(packages: $packages) { ${FOLLOW_FIELDS} }
  }`,
);

export const FollowPackagesDocument = doc<
  {
    followPackages: {
      refusal: string | null;
      notHeld: ApiPackage[];
      results: { channel: string; package: ApiPackage; result: string; url: string | null; limit: number | null }[];
    } | null;
  },
  {
    packages: ApiPackageInput[];
    events: ApiEvents;
    channels: string[];
    email: string | null;
    manageToken: string | null;
    visitorAddress: string | null;
  }
>(
  `mutation FollowPackages(
    $packages: [FollowPackageInput!]!
    $events: FollowEventSwitchesInput!
    $channels: [FollowChannelName!]!
    $email: String
    $manageToken: String
    $visitorAddress: String
  ) {
    followPackages(
      packages: $packages
      events: $events
      channels: $channels
      email: $email
      manageToken: $manageToken
      visitorAddress: $visitorAddress
    ) {
      refusal
      notHeld { registry name }
      results { channel package { registry name } result url limit }
    }
  }`,
);

export const FollowChangeDocument = doc<
  { followChange: { follow: ApiFollow | null } | null },
  { followId: string; events: ApiEvents | null; remove: boolean | null; undo: boolean | null }
>(
  `mutation FollowChange($followId: ID, $events: FollowEventSwitchesInput, $remove: Boolean, $undo: Boolean) {
    followChange(followId: $followId, events: $events, remove: $remove, undo: $undo) {
      follow { ${FOLLOW_FIELDS} }
    }
  }`,
);

const SUBSCRIBER_FIELDS = `id channel addressHint paused follows { ${FOLLOW_FIELDS} }`;

/**
 * The signed-in viewer's settings page: every address of their account with its package follows, in the shape the
 * settings page shows (enum values as the API spells them). Null when the feature is closed to the viewer.
 */
export const FollowingDocument = doc<{ following: SettingsSubscriber[] | null }>(
  `query Following { following { ${SUBSCRIBER_FIELDS} } }`,
);

export type FollowingChangeVariables = {
  followId?: string;
  events?: { notable: boolean; digest: boolean; milestones: boolean };
  remove?: boolean;
  undo?: boolean;
  resumeSubscriberId?: string;
};

/** A change on the signed-in settings page: a follow's switches, Unfollow, Undo, or sending to a paused address again. */
export const FollowingChangeDocument = doc<
  { followChange: { follow: SettingsFollow | null; subscriber: SettingsSubscriber | null } | null },
  FollowingChangeVariables
>(
  `mutation FollowingChange(
    $followId: ID
    $events: FollowEventSwitchesInput
    $remove: Boolean
    $undo: Boolean
    $resumeSubscriberId: ID
  ) {
    followChange(followId: $followId, events: $events, remove: $remove, undo: $undo, resumeSubscriberId: $resumeSubscriberId) {
      follow { ${FOLLOW_FIELDS} }
      subscriber { ${SUBSCRIBER_FIELDS} }
    }
  }`,
);

/** Unfollows every package of the signed-in viewer's account, on every channel: answers how many. */
export const FollowStopAllDocument = doc<{ followStopAll: number | null }>('mutation FollowStopAll { followStopAll }');
