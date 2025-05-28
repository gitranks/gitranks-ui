import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { ObjectId } from 'mongodb';
import NextAuth from 'next-auth';

import authConfig from './auth.config';
import mongoClientPromise from './lib/mongo-client';

// database but jwt ¯\_(ツ)_/¯
// https://authjs.dev/guides/edge-compatibility#middleware

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(mongoClientPromise),
  session: { strategy: 'jwt' },
  ...authConfig,
  events: {
    signIn: async ({ account, user, profile }) => {
      // profile - user entity from github
      // user - user entity from the database
      // account - OAuth account information

      if (account) {
        const client = await mongoClientPromise;
        const db = client.db('auth').collection('accounts');

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { expires_in, refresh_token_expires_in, ...accountData } = account;

        await db.updateOne(
          { userId: new ObjectId(user.id), provider: 'github' },
          { $set: { ...accountData, githubId: profile?.node_id, githubLogin: profile?.login } },
        );
      }
    },
  },
  callbacks: {
    async jwt({ token, profile, account }) {
      // token:   the existing token (an object you can modify)
      // user:    only present on first sign-in (the returned user object)
      // account: only on first sign-in (OAuth/account info)
      // profile: only on first sign-in (OAuth profile)
      // isNewUser: boolean flag on first sign-in

      token.error = undefined;

      if (account && profile) {
        // First-time login, save the `access_token`, its expiry and the `refresh_token`
        return {
          ...token,
          access_token: account.access_token,
          expires_at: account.expires_at,
          refresh_token: account.refresh_token,
          githubLogin: profile.login,
        };
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

        await db.updateOne({ githubLogin: token.githubLogin, provider: 'github' }, { $set: newData });

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
      return session;
    },
  },
});
