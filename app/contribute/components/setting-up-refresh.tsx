'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** How often the page reads itself again while the account is being set up. */
const EVERY_MS = 15_000;
/** A first read takes about a minute; after this long the page stops and leaves it to Refresh. */
const FOR_MS = 10 * 60_000;

/** Reads the page again every 15 seconds while it is open, for 10 minutes: the setup line goes once the account is ready. */
export function SettingUpAutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - started > FOR_MS) {
        window.clearInterval(timer);
        return;
      }
      router.refresh();
    }, EVERY_MS);
    return () => window.clearInterval(timer);
  }, [router]);
  return null;
}
