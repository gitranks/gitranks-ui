import { signOut } from 'next-auth/react';

import { forgetHeroApplication } from '@/lib/unsung-hero/hero-application-cookie';

/** Signing out forgets the browser's note of an open application, so the next account does not see it. */
export const signOutHere = (options?: { redirect: false }) => {
  forgetHeroApplication();
  return options ? signOut(options) : signOut();
};
