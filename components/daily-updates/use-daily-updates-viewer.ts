'use client';

import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

import { onDailyUpdatesRestart, visitUnderWay } from './visit-sync';
import type { DailyUpdatesViewer } from '@/types/daily-updates.types';

/** `idle` while not asked, `loading` while the read runs, `done` once it answered or failed. */
export type ViewerRead = 'idle' | 'loading' | 'done';

export type DailyUpdatesViewerState = {
  /** The visitor's own daily updates; `null` until read, when not asked, and when the read failed. */
  viewer: DailyUpdatesViewer | null;
  read: ViewerRead;
  /** Takes what a press answered, so the button follows without another read. */
  setViewer: Dispatch<SetStateAction<DailyUpdatesViewer | null>>;
  /** Reads the state again now, and answers it; a failed read keeps the state the button has. */
  reload: () => Promise<DailyUpdatesViewer | null>;
};

const isViewer = (value: unknown): value is DailyUpdatesViewer => {
  const viewer = value as Partial<DailyUpdatesViewer> | null;
  return (
    !!viewer &&
    typeof viewer.open === 'boolean' &&
    typeof viewer.state === 'string' &&
    !!viewer.manual &&
    typeof viewer.manual.available === 'boolean' &&
    Array.isArray(viewer.picks)
  );
};

const readViewer = (): Promise<DailyUpdatesViewer | null> =>
  fetch('/api/daily-updates', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : null))
    .then((body: unknown) => (isViewer(body) ? body : null))
    .catch(() => null);

/**
 * The signed-in visitor's daily updates, read in the browser after the page loads and never stored: the cached page
 * holds no visitor's state. `enabled` only for a signed-in visitor who could see them. The read waits for the day's
 * visit when one is under way, and runs again when a visit started daily updates again.
 */
export function useDailyUpdatesViewer(enabled: boolean): DailyUpdatesViewerState {
  const [viewer, setViewer] = useState<DailyUpdatesViewer | null>(null);
  const [read, setRead] = useState<ViewerRead>('idle');
  const [generation, setGeneration] = useState(0);
  // The visit the last read waited for: its restart needs no read again.
  const waitedFor = useRef(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    return onDailyUpdatesRestart((visitId) => {
      if (visitId !== waitedFor.current) {
        setGeneration((current) => current + 1);
      }
    });
  }, [enabled]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `generation` asks for the read again after a restart.
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    setRead('loading');
    const visit = visitUnderWay();
    waitedFor.current = visit.id;
    visit.settled.then(readViewer).then((body) => {
      if (!cancelled) {
        setViewer(body);
        setRead('done');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, generation]);

  const reload = useCallback(async () => {
    const body = await readViewer();
    if (body) {
      setViewer(body);
    }
    return body;
  }, []);

  return enabled ? { viewer, read, setViewer, reload } : { viewer: null, read: 'idle', setViewer, reload };
}
