'use client';

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

import type { DailyUpdatesViewer } from '@/types/daily-updates.types';

/** `idle` while not asked, `loading` while the read runs, `done` once it answered or failed. */
export type ViewerRead = 'idle' | 'loading' | 'done';

export type DailyUpdatesViewerState = {
  /** The visitor's own daily updates; `null` until read, when not asked, and when the read failed. */
  viewer: DailyUpdatesViewer | null;
  read: ViewerRead;
  /** Takes what a press answered, so the button follows without another read. */
  setViewer: Dispatch<SetStateAction<DailyUpdatesViewer | null>>;
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

/**
 * The signed-in visitor's daily updates, read in the browser after the page loads and never stored: the cached page
 * holds no visitor's state. `enabled` only for a signed-in visitor who could see them.
 */
export function useDailyUpdatesViewer(enabled: boolean): DailyUpdatesViewerState {
  const [viewer, setViewer] = useState<DailyUpdatesViewer | null>(null);
  const [read, setRead] = useState<ViewerRead>('idle');

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    setRead('loading');
    fetch('/api/daily-updates', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((body: unknown) => {
        if (!cancelled) {
          setViewer(isViewer(body) ? body : null);
          setRead('done');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return enabled ? { viewer, read, setViewer } : { viewer: null, read: 'idle', setViewer };
}
