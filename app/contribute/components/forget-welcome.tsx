'use client';

import { useEffect } from 'react';

import { forgetWelcomeOf } from '@/lib/contribute/agent-connect';

/**
 * Takes `?welcome=agent` out of the address once the welcome is shown, so a reload or that history entry shows the
 * overview, not the welcome again. Through the history alone: a navigation would read the page again, without it.
 */
export function ForgetWelcome() {
  useEffect(() => {
    const next = forgetWelcomeOf(window.location.href);
    if (next) window.history.replaceState(window.history.state, '', next);
  }, []);
  return null;
}
