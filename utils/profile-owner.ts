/**
 * Whether the signed-in viewer owns the profile: only then is anything of their own asked or shown on it (the
 * Contribute block, the owner's Skills box). Logins compare as GitHub compares them, ignoring case.
 */
export const isProfileOwner = (viewer: string | null | undefined, profile: string | null | undefined) =>
  !!viewer && !!profile && viewer.trim().toLowerCase() === profile.trim().toLowerCase();
