'use client';

import type { Route } from 'next';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

import { CONTRIBUTE_PROVIDER } from '@/lib/auth-providers';

/** Starts GitHub's consent for pull request access; GitHub sends the user back to `returnTo`. */
export function useGrantGithub(returnTo: Route) {
  const [pending, setPending] = useState(false);
  const grant = () => {
    setPending(true);
    signIn(CONTRIBUTE_PROVIDER, { redirectTo: returnTo }).catch(() => setPending(false));
  };
  return { grant, pending };
}
