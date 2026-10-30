'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Goes on to a page the moment the user is onboarded, in a new history entry or (`replace`) in the current one. Contribute's bar sits in the layout, which a client navigation
 * keeps as it was rendered, without the tabs; the refresh after the push reads the whole tree again, the bar with it.
 * The router runs the two in order, so the refresh is the new page's.
 */
export function useOnboardedPush() {
  const router = useRouter();
  return useCallback(
    (href: Route, { replace = false }: { replace?: boolean } = {}) => {
      if (replace) router.replace(href);
      else router.push(href);
      router.refresh();
    },
    [router],
  );
}
