import type { Session } from 'next-auth';

/**
 * What the Refresh button does for this visitor on this profile:
 * - `signed-out`: explains the deal and offers the identity sign-in;
 * - `token`: refreshes on the visitor's own token, any profile, as often as they like;
 * - `daily`: the visitor's own profile, once a day on our token, for a star on our repo;
 * - `other`: someone else's profile without a token; offers the token sign-in;
 * - `loading`: the session is not known yet, so a press does nothing. Read as signed out, it would offer the light
 *   sign-in to a token user, and taking it would swap their token session for a light one.
 */
export type RefreshMode = 'loading' | 'signed-out' | 'token' | 'daily' | 'other';

export function refreshModeOf(
  session: Session | null | undefined,
  login: string,
  status: 'loading' | 'authenticated' | 'unauthenticated' = 'authenticated',
): RefreshMode {
  if (status === 'loading') {
    return 'loading';
  }

  const user = session?.user;

  if (!user?.githubLogin) {
    return 'signed-out';
  }

  if (user.authMode === 'token') {
    return 'token';
  }

  return user.githubLogin.toLowerCase() === login.toLowerCase() ? 'daily' : 'other';
}
