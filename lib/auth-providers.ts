/**
 * Sign-in that only proves who the user is. GitHub asks for read-only access to the profile and email, and we keep no
 * token from it. A signed-in user gets one refresh of their own profile a day on our token, for a star on our repo.
 */
export const IDENTITY_PROVIDER = 'github-basic';

/**
 * Sign-in that hands us a token to refresh profiles with, on the user's own GitHub limits. GitHub says the app may act
 * on the user's behalf, which is why it is offered only to users who want more refreshes.
 */
export const TOKEN_PROVIDER = 'github';

export type AuthMode = 'identity' | 'token';

/** Sessions from before the identity sign-in carry a token and no mode. */
export const authModeOf = (token: Record<string, unknown>): AuthMode => {
  if (token.authMode === 'identity' || token.authMode === 'token') {
    return token.authMode;
  }

  return token.access_token ? 'token' : 'identity';
};

/**
 * Not a sign-in: a signed-in user links it from GitRanks Contribute so pull requests can open from their fork, in their
 * name. A classic OAuth App with `public_repo` only (no `workflow`, so nothing under `.github/workflows` can be pushed).
 * Its token is stored sealed and never enters the session.
 */
export const CONTRIBUTE_PROVIDER = 'github-contribute';
