import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';

import { CONTRIBUTE_PROVIDER, IDENTITY_PROVIDER } from './lib/auth-providers';

const identityClientId = process.env.AUTH_GITHUB_BASIC_ID;
const identityClientSecret = process.env.AUTH_GITHUB_BASIC_SECRET;

// Left unset, Auth.js would fill them from the token sign-in's app; an empty value fails loudly instead.
if ((!identityClientId || !identityClientSecret) && process.env.NEXT_PHASE !== 'phase-production-build') {
  console.error('AUTH_GITHUB_BASIC_ID or AUTH_GITHUB_BASIC_SECRET is not set: the light GitHub sign-in cannot work');
}

const contributeClientId = process.env.AUTH_GITHUB_CONTRIBUTE_ID;
const contributeClientSecret = process.env.AUTH_GITHUB_CONTRIBUTE_SECRET;

if ((!contributeClientId || !contributeClientSecret) && process.env.NEXT_PHASE !== 'phase-production-build') {
  console.warn(
    'AUTH_GITHUB_CONTRIBUTE_ID or AUTH_GITHUB_CONTRIBUTE_SECRET is not set: pull request access for Contribute cannot be granted',
  );
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
    // Linked from a signed-in session only (`auth.ts` refuses it otherwise). Classic `public_repo`: a pull request from
    // the user's fork to a repository they do not own needs it. No `workflow`, so GitHub refuses any push that touches
    // `.github/workflows`.
    GitHub({
      id: CONTRIBUTE_PROVIDER,
      name: 'GitHub pull requests',
      clientId: contributeClientId ?? '',
      clientSecret: contributeClientSecret ?? '',
      authorization: { params: { scope: 'public_repo' } },
    }),
  ],
} satisfies NextAuthConfig;
