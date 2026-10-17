import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';

import { IDENTITY_PROVIDER } from './lib/auth-providers';

// https://authjs.dev/guides/edge-compatibility#middleware
export default {
  providers: [
    // Both sign-ins are the same GitHub account, so one user may hold both (a token sign-in after the identity one).
    GitHub({ allowDangerousEmailAccountLinking: true }),
    GitHub({
      id: IDENTITY_PROVIDER,
      clientId: process.env.AUTH_GITHUB_BASIC_ID,
      clientSecret: process.env.AUTH_GITHUB_BASIC_SECRET,
      authorization: { params: { scope: 'read:user user:email' } },
      allowDangerousEmailAccountLinking: true,
    }),
  ],
} satisfies NextAuthConfig;
