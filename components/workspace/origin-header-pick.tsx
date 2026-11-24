'use client';

import { useSearchParams } from 'next/navigation';
import { type ReactNode, useSyncExternalStore } from 'react';

import type { Audience } from '@/lib/workspace/audience';
import { lastBarInCookies, type ProductBar, settingsBarOf } from '@/lib/workspace/settings-bar';

const noSubscribe = () => () => {};

/**
 * One of the two headers, by where the person came from (`settingsBarOf`): the address's `?from=`, then the bar seen
 * last, read from the browser's cookie (the server's read of it until the page is up), then the product they use. It
 * reads the query, so it renders inside a Suspense boundary.
 */
export function OriginHeaderPick({
  learnOpen,
  audience,
  lastBar,
  learn,
  contribute,
}: {
  learnOpen: boolean;
  audience: Audience;
  /** The server's read of the bar seen last. */
  lastBar: ProductBar | null;
  learn: ReactNode;
  contribute: ReactNode;
}) {
  const search = useSearchParams();
  const seenLast = useSyncExternalStore(
    noSubscribe,
    () => lastBarInCookies(document.cookie),
    () => lastBar,
  );
  return settingsBarOf({ from: search.get('from'), lastBar: seenLast, audience, learnOpen }) === 'learn'
    ? learn
    : contribute;
}
