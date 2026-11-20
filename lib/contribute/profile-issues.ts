import type { ContributeIssue } from '@/lib/workspace/contribute.types';
import { isProfileOwner } from '@/utils/profile-owner';

/** The profile block "Issues for you" shows this many. */
export const PROFILE_ISSUES_MAX = 3;

/** Where the profile block asks for the signed-in owner's issues. */
export const PROFILE_ISSUES_PATH = '/api/me/contribute/issues';

export type ProfileIssuesAnswer = { issues: ContributeIssue[] };

/** Where the profile block asks, for the owner of `profile`; null, nothing asked, for anyone else or nobody. */
export const profileIssuesUrl = (viewer: string | null | undefined, profile: string): string | null =>
  isProfileOwner(viewer, profile) ? `${PROFILE_ISSUES_PATH}?login=${encodeURIComponent(profile.trim())}` : null;
