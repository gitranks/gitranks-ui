'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Reads the page again every `seconds` while the tab is shown: for an attempt that moves on by itself. */
export function LiveRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);

  return null;
}
