'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { readInterviewsKey } from '../interviews-read';
import { InterviewsBar } from './interviews-bar';
import {
  type InterviewsBarView,
  interviewsBarPlaceOf,
  interviewsBarViewOf,
  VISITOR_INTERVIEWS_BAR,
} from '@/lib/interviews/interviews-bar';
import { INTERVIEWS_BAR_MINE_PATH } from '@/lib/interviews/paths';
import type { InterviewsBar as InterviewsBarRead } from '@/lib/interviews/types';
import { hasSessionHint } from '@/lib/session-hint';

/** The event a page sends when it changed what the bar shows (a plan started or stopped): the bar reads itself again. */
export const INTERVIEWS_BAR_CHANGED_EVENT = 'interviews:bar-changed';

/** Asks Interviews' bar on this page to read the person's bar again. */
export const askInterviewsBarAgain = () => window.dispatchEvent(new Event(INTERVIEWS_BAR_CHANGED_EVENT));

/**
 * Interviews' bar on Interviews' pages. The page is the same for everyone, so the bar starts as a visitor's, and the
 * person's own (My interviews) is read in the browser once the page is up, and again on each move to another page and
 * each change a page tells of. A browser with no session asks nothing. A read that fails leaves the bar as it was. It
 * reads the path alone, so it renders on the server with the current tab marked.
 */
export function InterviewsBarLive() {
  const pathname = usePathname();
  const [view, setView] = useState<InterviewsBarView>(VISITOR_INTERVIEWS_BAR);
  const [changed, setChanged] = useState(0);
  useEffect(() => {
    const again = () => setChanged((count) => count + 1);
    window.addEventListener(INTERVIEWS_BAR_CHANGED_EVENT, again);
    return () => window.removeEventListener(INTERVIEWS_BAR_CHANGED_EVENT, again);
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: each move to another page, and each change a page tells of, reads the bar again.
  useEffect(() => {
    if (!hasSessionHint(document.cookie)) return;
    let live = true;
    void readInterviewsKey(INTERVIEWS_BAR_MINE_PATH, 'bar').then((bar) => {
      if (live && bar && typeof bar === 'object') setView(interviewsBarViewOf(bar as InterviewsBarRead));
    });
    return () => {
      live = false;
    };
  }, [pathname, changed]);
  return <InterviewsBar view={view} place={interviewsBarPlaceOf(pathname)} />;
}
