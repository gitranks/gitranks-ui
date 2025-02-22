import { MongoDBAdapter } from '@auth/mongodb-adapter';
import NextAuth from 'next-auth';
import authConfig from './auth.config';
import mongoClientPromise from './lib/mongo-client';
import { ObjectId } from 'mongodb';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(mongoClientPromise),
  session: { strategy: 'jwt' },
  ...authConfig,
  events: {
    signIn: async ({ account, user, profile, isNewUser }) => {
      if (isNewUser && account?.provider === 'github') {
        const client = await mongoClientPromise;
        const db = client.db('auth');

        await db
          .collection('accounts')
          .updateOne(
            { userId: new ObjectId(user.id) },
            { $set: { githubId: profile?.node_id, githubLogin: profile?.login } },
          );
      }
    },
  },
  callbacks: {
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
