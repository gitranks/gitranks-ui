import type { ContributeIssue } from './contribute.types';

/** The profile block "Issues for you" shows this many. */
export const PROFILE_ISSUES_MAX = 3;

/** Where the profile block asks for the signed-in owner's issues. */
export const PROFILE_ISSUES_PATH = '/api/me/contribute/issues';

export type ProfileIssuesAnswer = { issues: ContributeIssue[] };

/** Whether the signed-in viewer owns the profile: only then is anything asked. */
export const isProfileOwner = (viewer: string | null | undefined, profile: string | null | undefined) =>
  !!viewer && !!profile && viewer.trim().toLowerCase() === profile.trim().toLowerCase();

/** Where the profile block asks, for the owner of `profile`; null, nothing asked, for anyone else or nobody. */
export const profileIssuesUrl = (viewer: string | null | undefined, profile: string): string | null =>
  isProfileOwner(viewer, profile) ? `${PROFILE_ISSUES_PATH}?login=${encodeURIComponent(profile.trim())}` : null;
