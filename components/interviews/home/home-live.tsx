'use client';

import { useEffect, useState } from 'react';

import { readInterviewsKeyWithin } from '../interviews-read';
import { InterviewsHomeView } from './home-view';
import { interviewsHomeViewOf, LANDING_HOME_VIEW, type InterviewsHomeView as View } from '@/lib/interviews/home';
import { INTERVIEWS_MY_HOME_MINE_PATH } from '@/lib/interviews/paths';
import type { InterviewsHome, InterviewsMyHome } from '@/lib/interviews/types';
import { hasSessionHint } from '@/lib/session-hint';

/**
 * Interviews home as it lives in the browser. The page is the same for everyone and comes drawn as the landing; once
 * it is up, a browser with a session reads the person's plans in progress (`/api/me/interviews/home`), and the page
 * becomes their home when they have one. While it reads, a browser with a session keeps the page hidden in its place;
 * a visitor asks for nothing.
 */
export function InterviewsHomeLive({ home }: Readonly<{ home: InterviewsHome }>) {
  const [view, setView] = useState<View>(LANDING_HOME_VIEW);
  const [reading, setReading] = useState(true);

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) {
      setReading(false);
      return;
    }
    let live = true;
    void readInterviewsKeyWithin(INTERVIEWS_MY_HOME_MINE_PATH, 'home').then((mine) => {
      if (!live) return;
      setView(interviewsHomeViewOf(mine as InterviewsMyHome | null | undefined));
      setReading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  return <InterviewsHomeView home={home} view={view} reading={reading} />;
}
