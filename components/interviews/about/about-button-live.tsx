'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { readInterviewsKey } from '../interviews-read';
import { INTERVIEWS_MAIN_BUTTON } from '../main-button';
import { aboutButtonOf } from '@/lib/interviews/about';
import { INTERVIEWS_BAR_MINE_PATH } from '@/lib/interviews/paths';
import type { InterviewsBar } from '@/lib/interviews/types';
import { hasSessionHint } from '@/lib/session-hint';

/**
 * The one button of How it works: "See the companies", turned in place into "Back to your plans" once the person's
 * bar says they have a plan in progress or finished. The page is the same for everyone, so a visitor asks nothing
 * and a read that fails leaves the button as it was.
 */
export function AboutButtonLive() {
  const [bar, setBar] = useState<InterviewsBar | null>(null);

  useEffect(() => {
    if (!hasSessionHint(document.cookie)) return;
    let live = true;
    void readInterviewsKey(INTERVIEWS_BAR_MINE_PATH, 'bar').then((read) => {
      if (live && read && typeof read === 'object') setBar(read as InterviewsBar);
    });
    return () => {
      live = false;
    };
  }, []);

  const button = aboutButtonOf(bar);
  return (
    <Link href={button.href} className={INTERVIEWS_MAIN_BUTTON} data-interviews-about-button="">
      {button.label}
    </Link>
  );
}
