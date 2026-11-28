'use client';

import { useSyncExternalStore } from 'react';

import { forgetBuildBarRead, readBuildBarWithin } from './build-bar-read';
import { hasSessionHint } from '@/lib/session-hint';

/*
 * What the site knows of the viewer and Build around its own pages: whether they started a build, for Grow's "New" in
 * the header. Those pages are cached and shared, so the server cannot know; the browser of a signed-in person reads
 * their bar once a page is up, and the answer holds for the life of the document, so a move to another page draws
 * the header right away.
 */

/** What the site knows of the viewer and Build. `hasBuild`: they started a build (Grow's "New" goes then); null when not known. */
export type BuildViewer = { hasBuild: boolean | null };

/** What the server renders, and what a browser has until its answer comes. */
export const SERVED_BUILD_VIEWER: BuildViewer = { hasBuild: null };

/** The longest the browser waits for each of the person's reads about Build; a later answer is not known. */
export const BUILD_READ_WAIT_MS = 3_000;

let viewer: BuildViewer = SERVED_BUILD_VIEWER;
let asked = false;
const listeners = new Set<() => void>();

/** One key of the JSON answer of one of the person's routes; undefined on any failure. */
export async function readBuildKey(path: string, key: string, signal?: AbortSignal): Promise<unknown> {
  try {
    const res = await fetch(path, { cache: 'no-store', ...(signal ? { signal } : {}) });
    if (!res.ok) return undefined;
    return ((await res.json()) as Record<string, unknown> | null)?.[key];
  } catch {
    return undefined;
  }
}

/** `readBuildKey` within `waitMs`: later, undefined, and the read stops. */
export async function readBuildKeyWithin(path: string, key: string, waitMs = BUILD_READ_WAIT_MS): Promise<unknown> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(undefined);
    }, waitMs);
  });
  try {
    return await Promise.race([readBuildKey(path, key, controller.signal), late]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Asks once for this document. A browser with no session asks nothing and keeps what was served; a signed-in person's
 * bar says whether they have a build. A bar that fails or is late leaves "New" (not known).
 */
async function ask(): Promise<void> {
  if (!hasSessionHint(document.cookie)) return;
  const bar = await readBuildBarWithin(BUILD_READ_WAIT_MS);
  if (typeof bar?.hasBuild !== 'boolean') return;
  viewer = { hasBuild: bar.hasBuild };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!asked) {
    asked = true;
    void ask();
  }
  return () => {
    listeners.delete(listener);
  };
}

const current = () => viewer;
const served = () => SERVED_BUILD_VIEWER;

/** The viewer as this browser knows it: what was served while hydrating and until the answer, then the answer. */
export function useBuildViewer(): BuildViewer {
  return useSyncExternalStore(subscribe, current, served);
}

/** Forgets the answer, so the next part drawn asks again (tests). */
export function resetBuildViewer(): void {
  viewer = SERVED_BUILD_VIEWER;
  asked = false;
  listeners.clear();
  forgetBuildBarRead();
}
