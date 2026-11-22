'use client';

import { type FC, useEffect, useState } from 'react';

import { nextUpdateText } from '@/utils/daily-updates-view';

const MINUTE = 60_000;

/**
 * The browser's clock, read after hydration and then once a minute. `null` on the server and while hydrating: the page
 * is cached, so a time worked out when it was rendered would be wrong by the time it is read.
 */
function useMinuteClock(): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), MINUTE);
    return () => clearInterval(timer);
  }, []);

  return now;
}

type DailyUpdatesLineProps = {
  /** Why it updates every day, as one sentence; empty when the time says it all. */
  lead: string;
  nextUpdateAt?: string | null;
};

/** Why the page updates every day, then "Next update in 5 h." by the browser's clock; empty when there is neither. */
export function useDailyUpdatesText(lead: string, nextUpdateAt?: string | null): string {
  const now = useMinuteClock();
  const next = now === null ? null : nextUpdateText(nextUpdateAt, now);
  return [lead, next].filter(Boolean).join(' ');
}

/** The small line under a button: why the page updates every day, then "Next update in 5 h." by the browser's clock. */
export const DailyUpdatesLine: FC<DailyUpdatesLineProps> = ({ lead, nextUpdateAt }) => {
  const text = useDailyUpdatesText(lead, nextUpdateAt);

  return text ? <div className="text-xs text-muted-foreground">{text}</div> : null;
};
