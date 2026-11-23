'use client';

import { useEffect, useRef } from 'react';

/** Controls that take Enter themselves: Enter on one of them is theirs, not the page's. */
const TAKES_ENTER = 'a, button, input, textarea, select, summary, [role="checkbox"], [contenteditable="true"]';

/**
 * Enter, where nothing else on the page takes it, does what `act` does: the screen's one main step (the review's end,
 * the check's result). None while `act` is null.
 */
export function useEnter(act: (() => void) | null) {
  useEffect(() => {
    if (!act) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.defaultPrevented || event.repeat || event.isComposing) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.(TAKES_ENTER)) return;
      event.preventDefault();
      act();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [act]);
}

/** Moves the focus to the title of a screen that replaced another, so a screen reader reads where it is now. */
export function useFocusOnShow<T extends HTMLElement>(show: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (show) ref.current?.focus();
  }, [show]);
  return ref;
}
