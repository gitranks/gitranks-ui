'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { LearnBar } from './learn-bar';
import {
  LEARN_SETUP_SETTLED_EVENT,
  type LearnBarRead,
  type LearnBarState,
  learnBarPlaceOf,
  learnBarStateOf,
} from '@/lib/learn/learn-bar';
import { startLearnSetupGuessAction } from '@/lib/learn/setup.actions';
import { hasSessionHint } from '@/lib/session-hint';
import { rememberBar } from '@/lib/workspace/settings-bar';

/** Where the browser reads Learn's bar for the signed-in person. */
export const LEARN_BAR_PATH = '/api/me/learn/bar';

/** How often the bar is read again while our guess runs, and how many times at most from one page. */
export const GUESS_POLL_MS = 2000;
export const GUESS_POLLS = 15;

/** The person's bar as the API answers it; none on any failure. */
export async function readLearnBar(): Promise<LearnBarRead | null> {
  try {
    const res = await fetch(LEARN_BAR_PATH, { cache: 'no-store' });
    if (!res.ok) return null;
    return ((await res.json()) as { bar?: LearnBarRead | null }).bar ?? null;
  } catch {
    return null;
  }
}

/**
 * Learn's bar on Learn's pages. The page is the same for everyone, so the bar starts as a visitor's and the person's
 * own (their tabs, what is due) is read in the browser once the page is up, and again on each move to another page,
 * since a review or a setup changes it. A browser with no session asks nothing. With no setup yet, our guess of it
 * starts here (Set up Learn starts it itself; the lesson, review and check pages, which have no bar, start it from
 * their own side: `useLearnSetupGuess`), and the bar is read again every two seconds while
 * it runs: "Set up Learn" shows a spinner until the guess is in, and the page hears when it is. `from` is the page's `?from=`, for a page both products
 * share. It records itself as the bar seen last.
 */
export function LearnBarLive({ from = null }: { from?: string | null }) {
  const pathname = usePathname();
  const [state, setState] = useState<LearnBarState>({ kind: 'visitor' });
  // The bar seen last, for Settings to show again (`settings-bar.ts`): kept for everyone, visitors too.
  useEffect(() => rememberBar('learn'), []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: each move to another page reads the bar again.
  useEffect(() => {
    if (!hasSessionHint(document.cookie)) return;
    // Set up Learn starts our guess itself and shows it: the bar only marks its tab as the current place there.
    const guessHere = learnBarPlaceOf(pathname, from) !== 'setup';
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // The last answer, kept while our guess runs: a read that fails then leaves the bar as it was.
    let last: LearnBarRead | null = null;
    const read = async (polls: number) => {
      const fetched = await readLearnBar();
      if (!live) return;
      const bar = fetched ?? (polls > 0 ? last : null);
      last = bar;
      if (!guessHere) {
        setState(learnBarStateOf(bar));
        return;
      }
      if (polls === 0 && bar?.setup === 'NONE') {
        // Our guess starts once from this page; the spinner shows until a read says it is in.
        setState(learnBarStateOf(bar, true));
        const started = await startLearnSetupGuessAction().catch(() => null);
        if (!live) return;
        if (!started?.ok) {
          setState(learnBarStateOf(bar));
          return;
        }
      }
      // A guess dropped (none again) or a read that failed ends the asking: the tab shows what the last answer said.
      const running =
        !!fetched && polls < GUESS_POLLS && (bar?.setup === 'WORKING' || (polls === 0 && bar?.setup === 'NONE'));
      setState(learnBarStateOf(bar, running));
      if (running) timer = setTimeout(() => void read(polls + 1), GUESS_POLL_MS);
      // In after reads while it ran: the page's own view of the setup is read again (`LEARN_SETUP_SETTLED_EVENT`).
      else if (polls > 0 && (bar?.setup === 'GUESSED' || bar?.setup === 'SAVED')) {
        window.dispatchEvent(new Event(LEARN_SETUP_SETTLED_EVENT));
      }
    };
    void read(0);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [pathname]);
  return <LearnBar state={state} place={learnBarPlaceOf(pathname, from)} />;
}
