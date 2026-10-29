import { MongoDBAdapter } from '@auth/mongodb-adapter';
import NextAuth from 'next-auth';
import type { Adapter, AdapterAccount } from 'next-auth/adapters';

import authConfig from './auth.config';
import { createAuthCallbacks } from './lib/auth-callbacks';
import { IDENTITY_PROVIDER, TOKEN_PROVIDER } from './lib/auth-providers';
import { type RemoveOtherGrants, withContributeGrant } from './lib/contribute/grant-adapter';
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
const accounts = async () => (await mongoClientPromise).db('auth').collection('accounts');

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
  callbacks: createAuthCallbacks({ accounts }),
});
