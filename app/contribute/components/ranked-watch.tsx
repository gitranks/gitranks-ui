'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { readFeedComputedAt } from '../actions';
import { MATCHING_GIVE_UP_MS, MATCHING_POLL_MS } from '@/lib/contribute/matching';

/** After the matching moment's span, the picks are asked about less often. */
const SLOWER_POLL_MS = 5_000;

/**
 * While the first picks are being ranked: asks when they were computed, as the matching moment does, while the tab is
 * shown, and reads the page again once they are. After the moment's 20s, it asks every 5s.
 */
export function RankedWatch() {
  const router = useRouter();

  useEffect(() => {
    const started = Date.now();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ask = async () => {
      if (document.visibilityState === 'visible') {
        const result = await readFeedComputedAt();
        if (stopped) return;
        if (result.ok && result.data) {
          router.refresh();
          return;
        }
      }
      if (stopped) return;
      timer = setTimeout(ask, Date.now() - started < MATCHING_GIVE_UP_MS ? MATCHING_POLL_MS : SLOWER_POLL_MS);
    };
    timer = setTimeout(ask, MATCHING_POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [router]);

  return null;
}
