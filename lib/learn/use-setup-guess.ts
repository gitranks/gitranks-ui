'use client';

import { useEffect } from 'react';

import type { LearnActionResult } from './learn-action';
import type { LearnSetupState } from './setup';
import { startLearnSetupGuessAction } from './setup.actions';
import { hasSessionHint } from '@/lib/session-hint';

/*
 * We guess a person's setup the first time they open a Learn page. Starting the guess is safe on every visit (it
 * starts only when there is no setup and no guess yet), so each Learn page a signed-in person opens asks for it once,
 * in the browser, without waiting for it: the page never depends on the answer.
 */

type Started = LearnActionResult<LearnSetupState | null> | null;

/** The one start of this page load; cleared when it fails, so a later page may try again. */
let started: Promise<Started> | null = null;

/** Starts our guess once per page load, however many parts of the page ask; never throws. */
export function startLearnSetupGuessOnce(): Promise<Started> {
  if (!started) {
    const attempt: Promise<Started> = startLearnSetupGuessAction()
      .catch(() => null)
      .then((result) => {
        if (!result?.ok && started === attempt) started = null;
        return result;
      });
    started = attempt;
  }
  return started;
}

/** For specs: forgets this page load's start. */
export function forgetLearnSetupGuessStart() {
  started = null;
}

/** Starts our guess from a Learn page for a person with a session, once the page is up; a visitor asks nothing. */
export function useLearnSetupGuess() {
  useEffect(() => {
    if (!hasSessionHint(document.cookie)) return;
    void startLearnSetupGuessOnce();
  }, []);
}
