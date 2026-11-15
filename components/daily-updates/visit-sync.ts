import type { DailyUpdatesVisitResult } from '@/types/daily-updates.types';

/**
 * Keeps the day's visit and the reads of the visitor's own daily updates in step, within one tab. A read waits for a
 * visit under way, and a visit that started daily updates again makes every reader that did not wait for it read
 * again, so a button never offers "Start daily updates" beside "Welcome back".
 */

type Visit = { id: number; settled: Promise<void> };

let lastId = 0;
let pending: Visit | null = null;
const restartListeners = new Set<(visitId: number) => void>();

/** Records a visit under way; its answer is `null` when the call failed. */
export function trackVisit(answer: Promise<DailyUpdatesVisitResult | null>) {
  lastId += 1;
  const id = lastId;
  const done = () => {
    if (pending?.id === id) {
      pending = null;
    }
  };
  const settled = answer.then((result) => {
    done();
    if (result?.restarted) {
      for (const listener of restartListeners) {
        listener(id);
      }
    }
  }, done);
  pending = { id, settled };
}

/** The visit under way, and when it settles; id 0 and settled when there is none. */
export const visitUnderWay = (): Visit => pending ?? { id: 0, settled: Promise.resolve() };

/** Calls `listener` with the visit's id after a visit that started daily updates again; returns the unsubscribe. */
export function onDailyUpdatesRestart(listener: (visitId: number) => void): () => void {
  restartListeners.add(listener);
  return () => {
    restartListeners.delete(listener);
  };
}
