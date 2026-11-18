/** Where a follower gets messages. */
export const FOLLOW_CHANNELS = ['email', 'telegram', 'whatsapp'] as const;
export type FollowChannel = (typeof FOLLOW_CHANNELS)[number];

/** A package follow's three switches. */
export const FOLLOW_EVENTS = ['notable', 'digest', 'milestones'] as const;
export type FollowEventName = (typeof FOLLOW_EVENTS)[number];
export type FollowEvents = Record<FollowEventName, boolean>;

/** A package one press follows. */
export type FollowPackage = { registry: 'npm'; name: string };

/** The most packages one press follows. */
export const FOLLOW_PACKAGES_MAX = 50;

/**
 * A channel the dialog may offer. `linked`, `addressHint` and `rankUpdates` are null for a visitor who is not signed
 * in; for a signed-in one they say whether their account already has an address there.
 */
export type FollowChannelOption = {
  channel: FollowChannel;
  open: boolean;
  /** How many packages one address there can follow. */
  limit: number;
  linked: boolean | null;
  addressHint: string | null;
  rankUpdates: boolean | null;
};

/** What the dialog asks when it opens: the channels and, for one package, how many repositories use it now. */
export type FollowChannels = {
  channels: FollowChannelOption[];
  /** Repositories with 100+ stars using the package; null when unknown. */
  dependents: number | null;
  /** How many of them have 1,000+ stars; null when unknown. */
  notable: number | null;
};

/**
 * The channels as the site's route answers them: with whether the settings page will open here (a signed-in viewer, or
 * a browser holding an email settings link's key now), so the dialog offers Settings only then. The key itself never
 * reaches the browser.
 */
export type FollowChannelsView = FollowChannels & { settingsLink: boolean };

export type FollowStatus = 'pending' | 'active' | 'removed';

/** One package followed at one of the signed-in viewer's addresses. */
export type FollowRow = {
  id: string;
  channel: FollowChannel;
  package: { registry: string; name: string };
  status: FollowStatus;
  events: FollowEvents;
};

/**
 * What became of one package on one channel after Follow. `active`: followed. `pending`: a confirmation email was sent.
 * `connect`: finished in the chat `url` opens. `closed`: the channel takes no follows here. `limit`: too many requests
 * for now. `full`: the address follows as many packages as the channel allows (`limit`). `invalid_email`: not an address.
 */
export type FollowStartResult = 'active' | 'pending' | 'connect' | 'closed' | 'limit' | 'full' | 'invalid_email';

export type FollowStartOutcome = {
  channel: FollowChannel;
  package: { registry: string; name: string };
  result: FollowStartResult;
  url: string | null;
  limit: number | null;
};

/**
 * A Follow press's answer. `refusal` set: nothing was followed, because package data cannot be read now
 * (`unavailable`) or because GitRanks has no data for the packages in `notHeld` (`not_held`).
 */
export type FollowStartAnswer = {
  refusal: 'unavailable' | 'not_held' | null;
  notHeld: { registry: string; name: string }[];
  results: FollowStartOutcome[];
};

/** A Follow press as the browser sends it. */
export type FollowStartBody = {
  packages: FollowPackage[];
  events: FollowEvents;
  channels: FollowChannel[];
  email?: string;
};

/** A change of one of the signed-in viewer's follows: its switches, Unfollow, or Undo. */
export type FollowChangeBody = {
  followId: string;
  events?: FollowEvents;
  remove?: boolean;
  undo?: boolean;
};

/** Why a follow route answered no data. */
export type FollowFailure = 'not_found' | 'sign_in' | 'invalid' | 'unavailable' | 'failed';
