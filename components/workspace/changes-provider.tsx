'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { ActivityProvider } from './activity';
import { readNeedsYouCount, readWorkspaceChanges } from '@/lib/workspace/actions';
import { ACTIVITY_STARTED_EVENT } from '@/lib/workspace/activity-format';
import {
  changesPollRunning,
  clearChangesWake,
  emitContributeChanges,
  fastChangesHeld,
  publishContributeActivity,
  setChangesWake,
} from '@/lib/workspace/changes-bus';
import {
  ANNOUNCE_MS,
  ANNOUNCE_READ_WAIT_MS,
  createChangesSession,
  startChangesPolling,
} from '@/lib/workspace/changes-poll';
import type { ContributeActivity } from '@/lib/workspace/contribute.types';

/** A move to another page asks for the count again, at most this often: a layout is not read again on the way. */
export const NEEDS_YOU_RECOUNT_MS = 10_000;

/**
 * The workspace's one poll, under the tabs. It asks what moved since the version the page was read at, every 30 s (a
 * minute once the user is idle; 5 then 10 s while a long read runs or a page waits on one), never while the tab is
 * hidden, at once when it is shown or focused. Nothing moved: nothing happens. Something did: the cards that follow
 * issues ask about themselves, the bar and the count of what needs the user are read in the same call, and the page
 * reads itself again only when it shows what moved (`refreshesFor`), or the work in progress moved on
 * (`createChangesSession`), which reads the count again with it. The count is also asked for after a move to another
 * page, which reads no layout again.
 */
export function ChangesProvider({
  version,
  activity: initial,
  needsYou: initialCount = null,
  standby = false,
  children,
}: {
  version: string | null;
  activity: ContributeActivity | null;
  needsYou?: number | null;
  /**
   * A poll for a page without the tabs (`WorkspaceLive`): it starts only when no other poll runs in the tab, and gives
   * way to the tabs' poll when that one starts. Mounted twice, the poll runs once.
   */
  standby?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [activity, setActivity] = useState(initial);
  const [needsYou, setNeedsYou] = useState(initialCount);
  const [announcedAt, setAnnouncedAt] = useState<number | null>(null);
  const path = useRef(pathname);
  const readNow = useRef<(() => void) | null>(null);
  const countedAt = useRef(0);
  // The count alone, after a move to another page.
  const [recount] = useState(() => () => {
    countedAt.current = Date.now();
    readNeedsYouCount().then(
      (result) => {
        if (result.ok) setNeedsYou(result.data);
      },
      () => {},
    );
  });
  const [session] = useState(() =>
    createChangesSession(version, initial, {
      read: (since, ask) => readWorkspaceChanges(since, ask),
      refresh: () => router.refresh(),
      showNeedsYou: (count) => {
        countedAt.current = Date.now();
        setNeedsYou(count);
      },
      emit: emitContributeChanges,
      showActivity: (next) => {
        setActivity(next);
        // The page's parts (Overview's Working now, My contributions' rows) follow the runs through the bus.
        publishContributeActivity(next);
      },
      pathname: () => path.current,
      held: fastChangesHeld,
    }),
  );

  // A page read again (`router.refresh()`) reads the tabs again too, with the count as the API has it now.
  useEffect(() => {
    countedAt.current = Date.now();
    setNeedsYou(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (path.current === pathname) return;
    path.current = pathname;
    if (Date.now() - countedAt.current >= NEEDS_YOU_RECOUNT_MS) recount();
  }, [pathname, recount]);

  // A newer read of the page (after a poll, or the user's own write): taken, so the next poll names nothing it shows.
  // The read a start of the user's waited for goes now.
  useEffect(() => {
    if (session.takePage(version, initial)) readNow.current?.();
  }, [session, version, initial]);

  useEffect(() => {
    if (standby && changesPollRunning()) return;
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
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      session.stop();
      polling.stop();
      clearTimeout(wait);
      readNow.current = null;
      clearChangesWake(polling.readNow);
      window.removeEventListener(ACTIVITY_STARTED_EVENT, onStarted);
    };
    setChangesWake(polling.readNow, standby ? { stop } : undefined);
    return stop;
  }, [session, standby]);

  useEffect(() => {
    if (announcedAt === null) return;
    const timer = setTimeout(() => setAnnouncedAt(null), ANNOUNCE_MS);
    return () => clearTimeout(timer);
  }, [announcedAt]);

  return (
    <ActivityProvider activity={activity} needsYou={needsYou} announced={announcedAt !== null}>
      {children}
    </ActivityProvider>
  );
}
