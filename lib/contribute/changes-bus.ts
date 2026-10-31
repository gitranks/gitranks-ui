import type { ContributeChangeArea } from './contribute.types';

/**
 * Between the one poll (in the tabs, `ChangesProvider`) and the parts of the page that follow it: the page is a sibling
 * of the tabs in the layout, so no React context reaches it. One tab, one bus.
 */

type Listener = (changed: readonly ContributeChangeArea[]) => void;

const listeners = new Set<Listener>();
let fastHolds = 0;
let wake: (() => void) | null = null;

/** Hears every poll that named a change; returns the unsubscribe. */
export function onContributeChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The poll's side: tells the listeners what moved. */
export function emitContributeChanges(changed: readonly ContributeChangeArea[]): void {
  if (!changed.length) return;
  for (const listener of [...listeners]) listener(changed);
}

/**
 * A page waiting on something that comes soon (the first picks ranked): the poll goes fast, and reads at once, until
 * the release. Returns the release, which counts once however often it is called.
 */
export function holdFastChanges(): () => void {
  fastHolds += 1;
  wake?.();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    fastHolds -= 1;
  };
}

export const fastChangesHeld = () => fastHolds > 0;

/** Whether the one poll runs in this tab (it does under the tabs, once the user is onboarded). */
export const changesPollRunning = () => wake !== null;

/** The poll's read-now, called when a page starts holding it fast. */
export function setChangesWake(readNow: () => void): void {
  wake = readNow;
}

/** The poll stopped: its read-now goes, unless another poll's took its place. */
export function clearChangesWake(readNow: () => void): void {
  if (wake === readNow) wake = null;
}
