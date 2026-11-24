'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { stampVisit, visitedToday } from './visit-stamp';
import { trackVisit } from '@/components/daily-updates/visit-sync';
import { WELCOME_BACK } from '@/components/refresh-dialogs/refresh-messages';
import type { DailyUpdatesVisitResult } from '@/types/daily-updates.types';

/** One "Welcome back" at a time, with no timeout and a close button. */
export const WELCOME_BACK_TOAST = { id: 'daily-updates-welcome-back', duration: Infinity, closeButton: true } as const;

/** A visit that was not counted is asked again at a later page, at most this often. */
export const VISIT_RETRY_AFTER = 60_000;

/**
 * Counts a signed-in visit, on any page, at most once a day per browser: it keeps the visitor's daily updates on for 7
 * more days, or starts them again after they ran out. The day is kept only once an answer needs no retry; until then
 * a later page asks again. Renders nothing.
 */
export function DailyUpdatesVisit() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const login = status === 'authenticated' ? session?.user?.githubLogin : undefined;
  // The login counted in this tab: once a day even where storage keeps no stamp.
  const counted = useRef<string | null>(null);
  // One call at a time, even when React runs the effect twice.
  const inFlight = useRef(false);
  const lastTry = useRef(Number.NEGATIVE_INFINITY);

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new page is a later visit, so `pathname` asks again.
  useEffect(() => {
    if (!login || counted.current === login || inFlight.current || visitedToday(login, Date.now())) {
      return;
    }
    const now = Date.now();
    if (now - lastTry.current < VISIT_RETRY_AFTER) {
      return;
    }
    lastTry.current = now;
    inFlight.current = true;

    const answer: Promise<DailyUpdatesVisitResult | null> = fetch('/api/daily-updates/visit', {
      method: 'POST',
      cache: 'no-store',
    })
      .then((res) => (res.ok ? (res.json() as Promise<DailyUpdatesVisitResult>) : null))
      .catch(() => null);
    trackVisit(answer);

    answer.then((result) => {
      inFlight.current = false;
      // Not counted: a later page asks again.
      if (!result || result.retry) {
        return;
      }
      counted.current = login;
      stampVisit(login, Date.now());
      if (result.restarted) {
        toast.success(WELCOME_BACK.title, { ...WELCOME_BACK_TOAST, description: WELCOME_BACK.text });
      }
    });
  }, [login, pathname]);

  return null;
}
