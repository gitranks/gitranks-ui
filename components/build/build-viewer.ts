'use client';

import { useSyncExternalStore } from 'react';

import { forgetBuildBarRead, readBuildBarWithin } from './build-bar-read';
import { BUILD_OPEN_TO_EVERYONE } from '@/lib/build/built-parts';
import { BUILD_OPEN_MINE_PATH } from '@/lib/build/paths';
import { hasSessionHint } from '@/lib/session-hint';

/*
 * Whether the site draws Build around its own pages for this browser: the header's Grow menu and the home page's
 * three cards. Those pages are cached and shared, so the server cannot know; the browser asks once a page is up, the
 * same way Build's pages ask (`/api/me/build/open`, never kept), and the answer holds for the life of the document,
 * so a move to another page draws the header right away.
 */

/**
 * What the site knows of the viewer and Build. `open`: Build is open to them. `hasBuild`: they started a build (Grow's
 * "New" goes then); null when not known.
 */
export type BuildViewer = { open: boolean; hasBuild: boolean | null };

/** What the server renders, and what a browser has until its answer comes: open only once Build is open to everyone. */
export const SERVED_BUILD_VIEWER: BuildViewer = { open: BUILD_OPEN_TO_EVERYONE, hasBuild: null };

/** The longest the browser waits for each of the person's reads about Build; a later answer is closed, or not known. */
export const BUILD_READ_WAIT_MS = 3_000;

let viewer: BuildViewer = SERVED_BUILD_VIEWER;
let asked = false;
let openRead: Promise<boolean> | null = null;
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
 * Whether Build is open to this browser's person, read once for the document and shared by every part that asks: open
 * to everyone, yes; with no session, no and nothing asked; otherwise the route's answer, closed on a failure or past
 * the wait.
 */
export function buildOpenForDocument(): Promise<boolean> {
  openRead ??= (async () => {
    if (BUILD_OPEN_TO_EVERYONE) return true;
    if (!hasSessionHint(document.cookie)) return false;
    return (await readBuildKeyWithin(BUILD_OPEN_MINE_PATH, 'open')) === true;
  })();
  return openRead;
}

/**
 * Asks once for this document. A browser with no session asks nothing and keeps what was served. For a signed-in
 * person, whether Build is open to them, then, only when it is, their bar, so the header changes once, with "New"
 * already right; a bar that fails or is late leaves "New" (not known).
 */
async function ask(): Promise<void> {
  if (!hasSessionHint(document.cookie)) return;
  if (!(await buildOpenForDocument())) return;
  const bar = await readBuildBarWithin(BUILD_READ_WAIT_MS);
  viewer = { open: true, hasBuild: typeof bar?.hasBuild === 'boolean' ? bar.hasBuild : null };
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
  openRead = null;
  listeners.clear();
  forgetBuildBarRead();
}
