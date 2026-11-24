'use client';

import type { Route } from 'next';
import { signIn } from 'next-auth/react';
import { useState } from 'react';

import { CONTRIBUTE_PROVIDER } from '@/lib/auth-providers';

/** Starts GitHub's consent for pull request access; GitHub sends the user back to `returnTo`, or the `to` given. */
export function useGrantGithub(returnTo: Route) {
  const [pending, setPending] = useState(false);
  /** `to`: another way back than `returnTo` (Approve's, with the key of what waits in the tab). */
  const grant = (to?: Route | unknown) => {
    setPending(true);
    // A button's click hands its event: the way back is then `returnTo`.
    const redirectTo = typeof to === 'string' ? to : returnTo;
    signIn(CONTRIBUTE_PROVIDER, { redirectTo }).catch(() => setPending(false));
  };
  return { grant, pending };
}
