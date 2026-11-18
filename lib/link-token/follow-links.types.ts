/** A package as a follow names it. */
export type FollowPackage = { registry: string; name: string };

/** A package follow's three switches: a 1,000+ star repository starts using it, the monthly digest, milestones. */
export type FollowEvents = { notable: boolean; digest: boolean; milestones: boolean };

export type FollowChannel = 'EMAIL' | 'TELEGRAM' | 'WHATSAPP';

/** PENDING: an email follow awaiting its confirmation. REMOVED: unfollowed, kept 7 days for Undo. */
export type FollowStatus = 'PENDING' | 'ACTIVE' | 'REMOVED';

export type PackageFollow = {
  id: string;
  channel: FollowChannel;
  status: FollowStatus;
  package: FollowPackage;
  events: FollowEvents;
};

/** One address and its package follows. `addressHint` has its middle hidden. */
export type FollowSubscriber = {
  id: string;
  channel: FollowChannel;
  addressHint: string;
  /** Nothing is sent there: the address refused mail twice. */
  paused: boolean;
  follows: PackageFollow[];
};

/** Why a confirmation link no longer confirms: pressed before, its 7 days ran out, or no such link. */
type ConfirmSettled = 'ALREADY_CONFIRMED' | 'EXPIRED' | 'UNKNOWN';

export type FollowConfirmPeekAnswer = {
  result: 'PENDING' | ConfirmSettled;
  packages: FollowPackage[];
  events: FollowEvents | null;
};

export type FollowConfirmAnswer = {
  result: 'CONFIRMED' | ConfirmSettled;
  packages: FollowPackage[];
  /** CONFIRMED, on the link's first press only: the key of the address's settings. */
  manageToken: string | null;
};

export type FollowChangeByTokenAnswer = { follow: PackageFollow | null; subscriber: FollowSubscriber | null };
