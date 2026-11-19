'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** How often the page reads itself again while the account is being set up. */
const EVERY_MS = 15_000;
/** A first read takes about a minute; after this long the page stops and leaves it to Refresh. */
const FOR_MS = 10 * 60_000;

/**
 * Reads the page again every 15 seconds for 10 minutes, while the tab is shown (once more when it is shown again): the
 * setup line goes once the account is ready.
 */
export function SettingUpAutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const started = Date.now();
    const due = () => Date.now() - started <= FOR_MS;
    const timer = window.setInterval(() => {
      if (!due()) {
        window.clearInterval(timer);
        return;
      }
      if (!document.hidden) router.refresh();
    }, EVERY_MS);
    const onShown = () => {
      if (!document.hidden && due()) router.refresh();
    };
    document.addEventListener('visibilitychange', onShown);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onShown);
    };
  }, [router]);
  return null;
}
