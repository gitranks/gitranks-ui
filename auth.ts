import { MongoDBAdapter } from '@auth/mongodb-adapter';
import NextAuth from 'next-auth';
import type { Adapter, AdapterAccount } from 'next-auth/adapters';

import authConfig from './auth.config';
import { authModeOf, CONTRIBUTE_PROVIDER, IDENTITY_PROVIDER, TOKEN_PROVIDER } from './lib/auth-providers';
import { grantSignInAllowed, type RemoveOtherGrants, withContributeGrant } from './lib/contribute/grant-adapter';
import { currentSessionToken } from './lib/contribute/session-token';
import mongoClientPromise from './lib/mongo-client';

const baseAdapter = MongoDBAdapter(mongoClientPromise);

// The identity sign-in's token is never used, so none of it is stored.
const withoutTokens = ({ access_token, refresh_token, id_token, expires_at, ...account }: AdapterAccount) => account;

const adapter: Adapter = {
  ...baseAdapter,
  // Both sign-ins are the same GitHub account, with the same id. Someone who once gave us a token is that user when
  // they come back through the light sign-in, so their session, and a later token sign-in, stay on one user.
  getUserByAccount: async (account) =>
    (await baseAdapter.getUserByAccount?.(account)) ??
    (account.provider === IDENTITY_PROVIDER
      ? ((await baseAdapter.getUserByAccount?.({ ...account, provider: TOKEN_PROVIDER })) ?? null)
      : null),
  linkAccount: (account) =>
    baseAdapter.linkAccount?.(account.provider === IDENTITY_PROVIDER ? withoutTokens(account) : account),
};

// A grant given again: the user's other grant rows go once the new one is in (`withContributeGrant`).
const removeOtherGrants: RemoveOtherGrants = async ({ provider, userId, keep }) => {
  const accounts = (await mongoClientPromise).db('auth').collection('accounts');
  await accounts.deleteMany({ provider, userId, _id: { $ne: keep } } as Record<string, unknown>);
};

// database but jwt ¯\_(ツ)_/¯
// https://authjs.dev/guides/edge-compatibility#middleware

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Pull request access for Contribute: linked to the signed-in user, its token sealed (`lib/contribute`).
  adapter: withContributeGrant(adapter, currentSessionToken, removeOtherGrants),
  session: { strategy: 'jwt' },
  ...authConfig,
  // Never on, in any environment: Auth.js's debug log prints every adapter call's arguments, and linking the GitHub
  // grant passes its token to the adapter in the clear (it is sealed there, after the log).
  debug: false,
  events: {
    signIn: async ({ account, profile }) => {
      // profile - user entity from github
      // user - user entity from the database
      // account - OAuth account information

      // Only the token sign-in's account row carries what refreshes run on.
      if (account?.provider === TOKEN_PROVIDER) {
        const client = await mongoClientPromise;
        const db = client.db('auth').collection('accounts');

        const { expires_in, refresh_token_expires_in, ...accountData } = account;

        await db.updateOne(
          { provider: TOKEN_PROVIDER, providerAccountId: account.providerAccountId },
          { $set: { ...accountData, githubId: profile?.node_id, githubLogin: profile?.login } },
        );
      }
    },
  },
  callbacks: {
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

      if (account && profile) {
        if (account.provider === IDENTITY_PROVIDER) {
          // Who the user is, nothing to refresh: refreshes run on our token, once a day
          return {
            ...token,
            access_token: undefined,
            expires_at: undefined,
            refresh_token: undefined,
            githubLogin: profile.login as string,
            authMode: 'identity',
          };
        }

        // First-time login, save the `access_token`, its expiry and the `refresh_token`
        return {
          ...token,
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

        const client = await mongoClientPromise;
        const db = client.db('auth').collection('accounts');

        await db.updateOne({ githubLogin: token.githubLogin, provider: TOKEN_PROVIDER }, { $set: newData });

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
  },
});
