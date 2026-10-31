'use client';

import { usePathname, useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { readContributeChanges } from '../actions';
import { ActivityProvider } from './activity';
import { ACTIVITY_STARTED_EVENT, activitySignatureOf } from '@/lib/contribute/activity-format';
import { emitContributeChanges, fastChangesHeld, setChangesWake } from '@/lib/contribute/changes-bus';
import {
  ACTIVITY_WAITING_READ_MS,
  afterChangesRead,
  type ChangesTick,
  heldOf,
  readsActivity,
  runningOf,
  startChangesPolling,
  takesVersion,
} from '@/lib/contribute/changes-poll';
import type { ContributeActivity } from '@/lib/contribute/contribute.types';

/** How long the bar says the user can leave, after they started something; the poll stays fast as long. */
const ANNOUNCE_MS = 12_000;
/** The reads that cannot succeed until the page is read again. */
const FINAL_ERRORS = new Set(['SIGNED_OUT', 'NOT_FOUND', 'NOT_AVAILABLE_YET']);

/**
 * Contribute's one poll, under the tabs. It asks what moved since the version the page was read at, every 30 s (a
 * minute once the user is idle; 5 then 10 s while a long read runs or a page waits on one), never while the tab is
 * hidden, at once when it is shown or focused. Nothing moved: nothing happens. Something did: the cards that follow
 * issues ask about themselves, the bar is read in the same call, and the page reads itself again only when it shows
 * what moved (`refreshesFor`), or the work in progress moved on.
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
  const held = useRef(heldOf(version, initial, Date.now()));
  const announcedUntil = useRef(0);

  useEffect(() => {
    path.current = pathname;
  }, [pathname]);

  // A newer read of the page (it was read again, after a poll or the user's own write): its version and work taken,
  // so the next poll names nothing the page already shows.
  useEffect(() => {
    if (takesVersion(version, held.current.version)) held.current = { ...held.current, version };
  }, [version]);
  useEffect(() => {
    const state = held.current;
    if (!initial || (state.activity && initial.readAt <= state.activity.readAt)) return;
    held.current = {
      ...state,
      activity: initial,
      signature: activitySignatureOf(initial),
      running: state.running || runningOf(initial),
      activityReadAt: Date.now(),
    };
    setActivity(initial);
  }, [initial]);

  useEffect(() => {
    const tick = async (): Promise<ChangesTick> => {
      const now = Date.now();
      const state = held.current;
      const withActivity = readsActivity({
        activity: state.activity,
        running: state.running || now < announcedUntil.current,
        waitingReadDue: now - state.activityReadAt >= ACTIVITY_WAITING_READ_MS,
      });
      const result = await readContributeChanges(state.version, withActivity);
      if (!result.ok) return FINAL_ERRORS.has(result.error) ? 'stop' : 'failed';
      if (!result.data) return 'stop';
      const step = afterChangesRead(held.current, result.data, path.current, now);
      held.current = step.held;
      if (result.data.activity !== undefined) setActivity(result.data.activity);
      emitContributeChanges(result.data.changes.changed);
      if (step.refresh) router.refresh();
      return 'ok';
    };
    const cadence = () =>
      held.current.running || fastChangesHeld() || Date.now() < announcedUntil.current ? 'fast' : 'normal';
    const polling = startChangesPolling(tick, cadence, { document, window });
    setChangesWake(polling.readNow);
    const onStarted = () => {
      announcedUntil.current = Date.now() + ANNOUNCE_MS;
      setAnnouncedAt(Date.now());
      polling.readNow();
    };
    window.addEventListener(ACTIVITY_STARTED_EVENT, onStarted);
    return () => {
      polling.stop();
      setChangesWake(null);
      window.removeEventListener(ACTIVITY_STARTED_EVENT, onStarted);
    };
  }, [router]);

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
