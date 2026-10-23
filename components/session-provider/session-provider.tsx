'use client';

import { __NEXTAUTH, SessionProvider as AuthSessionProvider } from 'next-auth/react';
import { type ReactNode, useEffect } from 'react';

import { hasSessionHint } from '@/lib/session-hint';

/**
 * Without the session hint, records "no session" before the provider's first fetch, so a signed-out page load sends
 * no session request. The provider treats a known empty session as current and skips the fetch on mount and on tab
 * focus; a sign-in in another tab still reaches this one through Auth.js's cross-tab broadcast. It renders as the
 * provider's child because React runs a child's effects before its parent's.
 */
const SkipSignedOutSessionFetch = () => {
  useEffect(() => {
    if (__NEXTAUTH._session === undefined && !hasSessionHint(document.cookie)) {
      __NEXTAUTH._session = null;
    }
  }, []);

  return null;
};

export function SessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AuthSessionProvider>
      <SkipSignedOutSessionFetch />
      {children}
    </AuthSessionProvider>
  );
}
