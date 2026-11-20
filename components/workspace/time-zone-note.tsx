'use client';

import { useEffect } from 'react';

import { setContributeEmailSettings } from '@/lib/workspace/actions';
import { browserTimeZone, rememberSentTimeZone, sentTimeZone } from '@/lib/workspace/email-settings';

/**
 * Tells the API the browser's time zone, for the morning summary at 8:00 the user's time: once per browser, and again
 * after a move (the last zone sent is kept in the browser). Nothing when the browser tells none. A zone the API does
 * not know is refused and not sent again; a failed call is tried again on the next visit. Draws nothing.
 */
export function TimeZoneNote() {
  useEffect(() => {
    const zone = browserTimeZone();
    if (!zone || zone === sentTimeZone()) return;
    setContributeEmailSettings({ timeZone: zone })
      .then((result) => {
        if (result.ok || result.error === 'INVALID') rememberSentTimeZone(zone);
      })
      .catch(() => {});
  }, []);
  return null;
}
