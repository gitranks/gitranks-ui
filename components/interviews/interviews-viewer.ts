'use client';

import { useSyncExternalStore } from 'react';

import { readInterviewsKeyWithin } from './interviews-read';
import { INTERVIEWS_OPEN_TO_EVERYONE } from '@/lib/interviews/interviews-parts';
import { INTERVIEWS_OPEN_MINE_PATH } from '@/lib/interviews/paths';
import { hasSessionHint } from '@/lib/session-hint';

/*
 * Whether the site draws Interviews around its own pages for this browser: the header's Grow entry, and later the
 * pieces on Learn's pages. Those pages are cached and shared, so the server cannot know; the browser asks once a page
 * is up (`/api/me/interviews/open`, never kept), as it asks about Build, and the answer holds for the life of the
 * document, so a move to another page draws the header right away.
 */

/** What the site knows of the viewer and Interviews. `open`: Interviews is open to them. */
export type InterviewsViewer = { open: boolean };

/** What the server renders, and what a browser has until its answer comes: open only once open to everyone. */
export const SERVED_INTERVIEWS_VIEWER: InterviewsViewer = { open: INTERVIEWS_OPEN_TO_EVERYONE };

let viewer: InterviewsViewer = SERVED_INTERVIEWS_VIEWER;
let asked = false;
let openRead: Promise<boolean> | null = null;
const listeners = new Set<() => void>();

/**
 * Whether Interviews is open to this browser's person, read once for the document and shared by every part that
 * asks: open to everyone, yes; with no session, no and nothing asked; otherwise the route's answer, closed on a
 * failure or past the wait.
 */
export function interviewsOpenForDocument(): Promise<boolean> {
  openRead ??= (async () => {
    if (INTERVIEWS_OPEN_TO_EVERYONE) return true;
    if (!hasSessionHint(document.cookie)) return false;
    return (await readInterviewsKeyWithin(INTERVIEWS_OPEN_MINE_PATH, 'open')) === true;
  })();
  return openRead;
}

/** Asks once for this document. A browser with no session asks nothing and keeps what was served. */
async function ask(): Promise<void> {
  if (!hasSessionHint(document.cookie)) return;
  if (!(await interviewsOpenForDocument())) return;
  viewer = { open: true };
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
const served = () => SERVED_INTERVIEWS_VIEWER;

/** The viewer as this browser knows it: what was served while hydrating and until the answer, then the answer. */
export function useInterviewsViewer(): InterviewsViewer {
  return useSyncExternalStore(subscribe, current, served);
}

/** Forgets the answer, so the next part drawn asks again (tests). */
export function resetInterviewsViewer(): void {
  viewer = SERVED_INTERVIEWS_VIEWER;
  asked = false;
  openRead = null;
  listeners.clear();
}
