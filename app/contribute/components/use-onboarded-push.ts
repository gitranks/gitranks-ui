'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Goes on to a page the moment the user is onboarded. Contribute's bar sits in the layout, which a client navigation
 * keeps as it was rendered, without the tabs; the refresh after the push reads the whole tree again, the bar with it.
 * The router runs the two in order, so the refresh is the new page's.
 */
export function useOnboardedPush() {
  const router = useRouter();
  return useCallback(
    (href: Route) => {
      router.push(href);
      router.refresh();
    },
    [router],
  );
}
