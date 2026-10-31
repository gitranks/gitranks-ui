'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { readContributeChanges } from '../actions';
import { ActivityProvider } from './activity';
import { ACTIVITY_STARTED_EVENT } from '@/lib/contribute/activity-format';
import { clearChangesWake, emitContributeChanges, fastChangesHeld, setChangesWake } from '@/lib/contribute/changes-bus';
import {
  ANNOUNCE_MS,
  ANNOUNCE_READ_WAIT_MS,
  createChangesSession,
  startChangesPolling,
} from '@/lib/contribute/changes-poll';
import type { ContributeActivity } from '@/lib/contribute/contribute.types';

/**
 * Contribute's one poll, under the tabs. It asks what moved since the version the page was read at, every 30 s (a
 * minute once the user is idle; 5 then 10 s while a long read runs or a page waits on one), never while the tab is
 * hidden, at once when it is shown or focused. Nothing moved: nothing happens. Something did: the cards that follow
 * issues ask about themselves, the bar is read in the same call, and the page reads itself again only when it shows
 * what moved (`refreshesFor`), or the work in progress moved on (`createChangesSession`).
 */
export function ChangesProvider({
  version,
  activity: initial,
  children,
}: {
  version: string | null;
  activity: ContributeActivity | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [activity, setActivity] = useState(initial);
  const [announcedAt, setAnnouncedAt] = useState<number | null>(null);
  const path = useRef(pathname);
  const readNow = useRef<(() => void) | null>(null);
  const [session] = useState(() =>
    createChangesSession(version, initial, {
      read: (since, withActivity) => readContributeChanges(since, withActivity),
      refresh: () => router.refresh(),
      emit: emitContributeChanges,
      showActivity: setActivity,
      pathname: () => path.current,
      held: fastChangesHeld,
    }),
  );

  useEffect(() => {
    path.current = pathname;
  }, [pathname]);

  // A newer read of the page (after a poll, or the user's own write): taken, so the next poll names nothing it shows.
  // The read a start of the user's waited for goes now.
  useEffect(() => {
    if (session.takePage(version, initial)) readNow.current?.();
  }, [session, version, initial]);

  useEffect(() => {
    const polling = startChangesPolling(
      async () => {
        const outcome = await session.tick();
        if (outcome === 'stop') clearChangesWake(polling.readNow);
        return outcome;
      },
      () => session.cadence(),
      { document, window },
    );
    readNow.current = polling.readNow;
    setChangesWake(polling.readNow);
    let wait: ReturnType<typeof setTimeout> | undefined;
    const onStarted = () => {
      session.announce();
      setAnnouncedAt(Date.now());
      // The user's own page read comes first (its version says what they just wrote); the read goes at it, or soon.
      clearTimeout(wait);
      wait = setTimeout(() => {
        if (session.announceWaited()) polling.readNow();
      }, ANNOUNCE_READ_WAIT_MS);
    };
    window.addEventListener(ACTIVITY_STARTED_EVENT, onStarted);
    return () => {
      session.stop();
      polling.stop();
      clearTimeout(wait);
      readNow.current = null;
      clearChangesWake(polling.readNow);
      window.removeEventListener(ACTIVITY_STARTED_EVENT, onStarted);
    };
  }, [session]);

  useEffect(() => {
    if (announcedAt === null) return;
    const timer = setTimeout(() => setAnnouncedAt(null), ANNOUNCE_MS);
    return () => clearTimeout(timer);
  }, [announcedAt]);

  return (
    <ActivityProvider activity={activity} announced={announcedAt !== null}>
      {children}
    </ActivityProvider>
  );
}
