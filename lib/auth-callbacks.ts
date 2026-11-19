import type { NextAuthConfig } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

import { authModeOf, CONTRIBUTE_PROVIDER, IDENTITY_PROVIDER, TOKEN_PROVIDER } from './auth-providers';
import { dropExpiredMaintainerToken, lightSignInSession } from './contribute/maintainer-token';
import { verifiedEmailOf } from './follow/verified-email';
import { grantSignInAllowed } from './workspace/grant-adapter';
import { currentSessionToken } from './workspace/session-token';

/** The store of sign-in accounts, as the callbacks use it: one row updated after a token refresh. */
export type AuthAccounts = {
  updateOne: (filter: Record<string, unknown>, update: { $set: Record<string, unknown> }) => Promise<unknown>;
};

/**
 * Auth.js's callbacks for `auth.ts`: who may sign in, what the session token keeps, and what the browser is given.
 * Kept here, apart from the adapter and its store, so they can be tested on their own.
 */
export const createAuthCallbacks = ({
  accounts,
}: {
  accounts: () => Promise<AuthAccounts>;
}): NonNullable<NextAuthConfig['callbacks']> => ({
  // Pull request access is linked to the signed-in user, never a way in.
  signIn: ({ account, profile }) =>
    account?.provider === CONTRIBUTE_PROVIDER ? grantSignInAllowed(profile, currentSessionToken) : true,

  async jwt({ token, profile, account }) {
    // token:   the existing token (an object you can modify)
    // user:    only present on first sign-in (the returned user object)
    // account: only on first sign-in (OAuth/account info)
    // profile: only on first sign-in (OAuth profile)
    // isNewUser: boolean flag on first sign-in

    if (account?.provider === CONTRIBUTE_PROVIDER) {
      // Linking the grant hands this callback a fresh token: the session stays what it was, without the grant's.
      return await currentSessionToken();
    }

    token.error = undefined;
    dropExpiredMaintainerToken(token);

    if (account && profile) {
      // At every sign-in, whether GitHub marks the session's email verified now (the scope both sign-ins ask for). Kept
      // as that address, so a session whose email changes later never counts as verified; unset when it is not.
      const verifiedEmail = await verifiedEmailOf(token.email, account.access_token);

      if (account.provider === IDENTITY_PROVIDER) {
        // Who the user is, nothing to refresh: refreshes run on our token, once a day
        const identity: JWT = {
          ...token,
          verifiedEmail,
          access_token: undefined,
          expires_at: undefined,
          refresh_token: undefined,
          githubLogin: profile.login as string,
          authMode: 'identity',
        };
        // Started on the maintainers page, it keeps its GitHub token for that page alone, never in `session` below.
        // That sign-in may keep the session the person already had: this sign-in's read of the email replaces its own.
        const signedIn = await lightSignInSession(identity, account);
        return { ...signedIn, verifiedEmail };
      }

      // First-time login, save the `access_token`, its expiry and the `refresh_token`
      return {
        ...token,
        verifiedEmail,
        access_token: account.access_token,
        expires_at: account.expires_at,
        refresh_token: account.refresh_token,
        githubLogin: profile.login as string,
        authMode: 'token',
      };
    } else if (authModeOf(token) === 'identity') {
      return token;
    } else if (Date.now() < (token.expires_at as number) * 1000) {
      // Subsequent logins, but the `access_token` is still valid
      return token;
    }

    // Subsequent logins, but the `access_token` has expired, try to refresh it
    if (!token.refresh_token) {
      throw new TypeError('Missing refresh_token');
    }

    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          client_id: process.env.AUTH_GITHUB_ID!,
          client_secret: process.env.AUTH_GITHUB_SECRET!,
          grant_type: 'refresh_token',
          refresh_token: token.refresh_token as string,
        }),
      });

      const tokensOrError = await response.json();

      if (!response.ok) {
        throw tokensOrError;
      }

      const newTokens = tokensOrError as {
        access_token: string;
        expires_in: number;
        refresh_token?: string;
      };

      const newData = {
        access_token: newTokens.access_token,
        expires_at: Math.floor(Date.now() / 1000 + newTokens.expires_in),
        refresh_token: newTokens.refresh_token,
      };

      await (await accounts()).updateOne(
        { githubLogin: token.githubLogin, provider: TOKEN_PROVIDER },
        { $set: newData },
      );

      return { ...token, ...newData };
    } catch {
      // If we fail to refresh the token, return an error so we can handle it on the page
      token.error = 'RefreshTokenError';
      return token;
    }
  },

  async session({ session, token }) {
    // session: what will be returned to the client
    // token:   the latest JWT (as returned by your jwt() callback)
    // user:    database user (if you’re using a database session strategy)

    session.error = token.error as string | undefined;
    session.user.githubLogin = token.githubLogin as string;
    // The sign-in's own user row, which a data removal deletes (`app/api/me/data-removal`).
    session.user.id = token.sub as string;
    session.user.authMode = authModeOf(token);
    return session;
  },
});
