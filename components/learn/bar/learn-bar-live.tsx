'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { LearnBar } from './learn-bar';
import { type LearnBarRead, type LearnBarState, learnBarPlaceOf, learnBarStateOf } from '@/lib/learn/learn-bar';

/** Where the browser reads Learn's bar for the signed-in person. */
export const LEARN_BAR_PATH = '/api/me/learn/bar';

/** The person's bar, read in the browser; a visitor's on any failure. */
export async function readLearnBar(): Promise<LearnBarState> {
  try {
    const res = await fetch(LEARN_BAR_PATH, { cache: 'no-store' });
    if (!res.ok) return { kind: 'visitor' };
    return learnBarStateOf(((await res.json()) as { bar?: LearnBarRead | null }).bar);
  } catch {
    return { kind: 'visitor' };
  }
}

/**
 * Learn's bar on Learn's pages. The page is the same for everyone, so the bar starts as a visitor's and the person's
 * own (their tabs, what is due) is read in the browser once the page is up, and again on each move to another page,
 * since a review or a setup changes it. `from` is the page's `?from=`, for a page both products share.
 */
export function LearnBarLive({ from = null }: { from?: string | null }) {
  const pathname = usePathname();
  const [state, setState] = useState<LearnBarState>({ kind: 'visitor' });
  // biome-ignore lint/correctness/useExhaustiveDependencies: each move to another page reads the bar again.
  useEffect(() => {
    let live = true;
    readLearnBar().then((next) => {
      if (live) setState(next);
    });
    return () => {
      live = false;
    };
  }, [pathname]);
  return <LearnBar state={state} place={learnBarPlaceOf(pathname, from)} />;
}
