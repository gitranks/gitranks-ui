'use client';

import { useSyncExternalStore } from 'react';

import { BUILD_OPEN_TO_EVERYONE } from '@/lib/build/built-parts';
import { BUILD_BAR_MINE_PATH, BUILD_OPEN_MINE_PATH } from '@/lib/build/paths';
import type { BuildBar } from '@/lib/build/types';
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

/** Whether Build is open to the signed-in person, as the route answers; closed on any failure. */
export const readBuildOpen = async (): Promise<boolean> => (await readBuildKey(BUILD_OPEN_MINE_PATH, 'open')) === true;

/**
 * Asks once for this document. A browser with no session asks nothing and keeps what was served. For a signed-in
 * person, whether Build is open to them, then, only when it is, their bar, so the header changes once, with "New"
 * already right.
 */
async function ask(): Promise<void> {
  if (!hasSessionHint(document.cookie)) return;
  const open = BUILD_OPEN_TO_EVERYONE || (await readBuildOpen());
  if (!open) return;
  const bar = (await readBuildKey(BUILD_BAR_MINE_PATH, 'bar')) as BuildBar | null | undefined;
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
  listeners.clear();
}
