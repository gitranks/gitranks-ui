import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';

import { IDENTITY_PROVIDER } from './lib/auth-providers';

const identityClientId = process.env.AUTH_GITHUB_BASIC_ID;
const identityClientSecret = process.env.AUTH_GITHUB_BASIC_SECRET;

// Left unset, Auth.js would fill them from the token sign-in's app; an empty value fails loudly instead.
if ((!identityClientId || !identityClientSecret) && process.env.NEXT_PHASE !== 'phase-production-build') {
  console.error('AUTH_GITHUB_BASIC_ID or AUTH_GITHUB_BASIC_SECRET is not set: the light GitHub sign-in cannot work');
}

// https://authjs.dev/guides/edge-compatibility#middleware
export default {
  providers: [
    GitHub,
    GitHub({
      id: IDENTITY_PROVIDER,
      clientId: identityClientId ?? '',
      clientSecret: identityClientSecret ?? '',
      authorization: { params: { scope: 'read:user user:email' } },
    }),
  ],
} satisfies NextAuthConfig;
