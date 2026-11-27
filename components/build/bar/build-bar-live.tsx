'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { BuildBar } from './build-bar';
import { type BuildBarView, buildBarPlaceOf, buildBarViewOf, VISITOR_BUILD_BAR } from '@/lib/build/build-bar';
import { BUILD_BAR_MINE_PATH } from '@/lib/build/paths';
import type { BuildBar as BuildBarRead } from '@/lib/build/types';
import { hasSessionHint } from '@/lib/session-hint';

/** The person's bar as the API answers it; none on any failure. */
export async function readBuildBar(): Promise<BuildBarRead | null> {
  try {
    const res = await fetch(BUILD_BAR_MINE_PATH, { cache: 'no-store' });
    if (!res.ok) return null;
    return ((await res.json()) as { bar?: BuildBarRead | null }).bar ?? null;
  } catch {
    return null;
  }
}

/**
 * Build's bar on Build's pages. The page is the same for everyone, so the bar starts as a visitor's, and the person's
 * own (My builds, Settings, a test that waits) is read in the browser once the page is up, and again on each move to
 * another page, since a test taken or a build started changes it. A browser with no session asks nothing. A read that
 * fails leaves the bar as it was. It reads the path alone, so it renders on the server with the current tab marked; a
 * page every product shares (Settings) passes its own `?from=`.
 */
export function BuildBarLive({ from = null }: { from?: string | null }) {
  const pathname = usePathname();
  const [view, setView] = useState<BuildBarView>(VISITOR_BUILD_BAR);
  // biome-ignore lint/correctness/useExhaustiveDependencies: each move to another page reads the bar again.
  useEffect(() => {
    if (!hasSessionHint(document.cookie)) return;
    let live = true;
    void readBuildBar().then((bar) => {
      if (live && bar) setView(buildBarViewOf(bar));
    });
    return () => {
      live = false;
    };
  }, [pathname]);
  return <BuildBar view={view} place={buildBarPlaceOf(pathname, from)} />;
}
