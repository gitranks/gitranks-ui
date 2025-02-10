import { MongoDBAdapter } from '@auth/mongodb-adapter';
import NextAuth from 'next-auth';
import authConfig from './auth.config';
import mongoClientPromise from './lib/mongo-client';
import { ObjectId } from 'mongodb';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(mongoClientPromise),
  session: { strategy: 'jwt' },
  ...authConfig,
  callbacks: {
    /**
     * signIn is called whenever a user signs in (OAuth or credentials).
     * Here we have access to the `profile`, which includes GitHub user info.
     */
    async signIn({ account, profile, user }) {
      // Only do this if the provider is GitHub
      if (account?.provider === 'github') {
        const client = await mongoClientPromise;
        const db = client.db('auth');

        await db
          .collection('accounts')
          .updateOne(
            { userId: new ObjectId(user.id) },
            { $set: { githubId: profile?.node_id, githubLogin: profile?.login } },
          );
      }
      return true;
    },

    async jwt({ token, profile, account }) {
      if (profile && account?.provider === 'github') {
        token.githubId = profile.node_id;
      }
      return token;
    },

    async session({ session, token }) {
      if (token?.githubId) {
        session.user.githubId = token.githubId as string;
      }
      return session;
    },
  },
});
