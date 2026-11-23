'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useSyncExternalStore } from 'react';

import { scrollToHash } from '@/components/workspace/scroll-to-hash';
import type { Audience } from '@/lib/workspace/audience';
import { isSharedSettingsPath, lastBarInCookies, type ProductBar, settingsBarOf } from '@/lib/workspace/settings-bar';

const noSubscribe = () => () => {};

/**
 * The workspace's bar, or Learn's on Settings when Learn opened it (`settingsBarOf`): the link's `?from=learn`, else the
 * bar seen last, read from the browser's cookie on each move (the server's read of it, `lastBar`, until the page is
 * up), else the product the person uses. It reads the path and the query, so it renders inside a Suspense boundary.
 */
export function BarSwitch({
  learnOpen,
  audience,
  lastBar,
  learn,
  children,
}: {
  learnOpen: boolean;
  audience: Audience;
  lastBar: ProductBar | null;
  /** Learn's bar. */
  learn: ReactNode;
  /** The workspace's tabs. */
  children: ReactNode;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const seenLast = useSyncExternalStore(
    noSubscribe,
    () => lastBarInCookies(document.cookie),
    () => lastBar,
  );
  const showLearn =
    isSharedSettingsPath(pathname) &&
    settingsBarOf({ from: search.get('from'), lastBar: seenLast, audience, learnOpen }) === 'learn';
  // Learn's bar arrives after the screen, as the tabs do: a link's jump to a section is made again under it.
  useEffect(() => {
    if (showLearn) scrollToHash();
  }, [showLearn]);
  return showLearn ? learn : children;
}
