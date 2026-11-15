'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { stampVisit, visitedToday } from './visit-stamp';
import { WELCOME_BACK } from '@/components/refresh-dialogs/refresh-messages';
import type { DailyUpdatesVisitResult } from '@/types/daily-updates.types';

/** One "Welcome back" at a time, with no timeout and a close button. */
export const WELCOME_BACK_TOAST = { id: 'daily-updates-welcome-back', duration: Infinity, closeButton: true } as const;

/**
 * Counts a signed-in visit, on any page, at most once a day per browser: it keeps the visitor's daily updates on for 7
 * more days, or starts them again after they ran out. The day is kept only once an answer needs no retry. Renders
 * nothing.
 */
export function DailyUpdatesVisit() {
  const { data: session, status } = useSession();
  const login = status === 'authenticated' ? session?.user?.githubLogin : undefined;
  // One visit per login while this page lives, even when React runs the effect twice.
  const sent = useRef<string | null>(null);

  useEffect(() => {
    if (!login || sent.current === login || visitedToday(login)) {
      return;
    }
    sent.current = login;

    fetch('/api/daily-updates/visit', { method: 'POST', cache: 'no-store' })
      .then((res) => (res.ok ? (res.json() as Promise<DailyUpdatesVisitResult>) : null))
      .then((answer) => {
        if (!answer || answer.retry) {
          return;
        }
        stampVisit(login);
        if (answer.restarted) {
          toast.success(WELCOME_BACK.title, { ...WELCOME_BACK_TOAST, description: WELCOME_BACK.text });
        }
      })
      .catch(() => {
        // Not counted: a later page asks again.
      });
  }, [login]);

  return null;
}
