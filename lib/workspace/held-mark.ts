import { useEffect, useState } from 'react';

import { maskIdOf } from './masked-issue';

/**
 * The browser's mark of the issue the person holds open now: its mask id and when the hold ends. No list read says
 * which issue the person holds, so the page of one issue writes it when a look starts or is held longer, and clears it
 * when the issue is given back or started; it ends by itself at its time. While it is live, every other masked row says
 * that seeing it gives the held one back, and the held issue's own row opens its page without a new press.
 */
export type HeldMark = { id: string; until: string };

const KEY = 'gitranks:held-issue';
/** Said in this tab when the mark changes; other tabs hear the storage event. */
const CHANGED = 'gitranks:held-issue-changed';

const storage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

const said = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHANGED));
};

/** The mark while it is live; null when there is none, it is not one, or its time is past. */
export function readHeldMark(at?: number): HeldMark | null {
  const now = at ?? Date.now();
  let raw: string | null = null;
  try {
    raw = storage()?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<HeldMark> | null;
    const id = maskIdOf(value?.id);
    const until = typeof value?.until === 'string' ? Date.parse(value.until) : Number.NaN;
    if (id && Number.isFinite(until) && until > now) return { id, until: new Date(until).toISOString() };
  } catch {
    // Not a mark: dropped below.
  }
  try {
    storage()?.removeItem(KEY);
  } catch {
    // A browser that keeps nothing: there is no mark.
  }
  return null;
}

/** The issue held, until its hold ends. */
export function writeHeldMark(mark: HeldMark): void {
  const id = maskIdOf(mark.id);
  if (!id || !Number.isFinite(Date.parse(mark.until))) return;
  try {
    storage()?.setItem(KEY, JSON.stringify({ id, until: mark.until }));
  } catch {
    return;
  }
  said();
}

/** The issue is no longer held (given back, started): the mark goes, when it is this issue's. */
export function clearHeldMark(id: string): void {
  const now = readHeldMark();
  if (!now || now.id !== id) return;
  try {
    storage()?.removeItem(KEY);
  } catch {
    return;
  }
  said();
}

/** The live mark, kept up to date across tabs and ended at its time; null on the server and before the first read. */
export function useHeldMark(): HeldMark | null {
  const [mark, setMark] = useState<HeldMark | null>(null);
  useEffect(() => {
    const read = () =>
      setMark((was) => {
        const next = readHeldMark();
        return was?.id === next?.id && was?.until === next?.until ? was : next;
      });
    read();
    window.addEventListener('storage', read);
    window.addEventListener(CHANGED, read);
    return () => {
      window.removeEventListener('storage', read);
      window.removeEventListener(CHANGED, read);
    };
  }, []);
  // The hold ends by itself at its time.
  useEffect(() => {
    if (!mark) return;
    const timer = setTimeout(() => setMark(readHeldMark()), Math.max(0, Date.parse(mark.until) - Date.now()) + 50);
    return () => clearTimeout(timer);
  }, [mark]);
  return mark;
}
