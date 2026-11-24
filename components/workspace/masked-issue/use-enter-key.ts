'use client';

import { useEffect, useRef } from 'react';

/** Where Enter belongs to the element itself: a field, a button, a link, an editable box. */
const OWN_ENTER = 'input, textarea, select, button, a, [contenteditable="true"], [role="radio"], [role="button"]';

/**
 * Enter does the page's main action, as the key on its button says, while no field, button or link has the focus
 * (there Enter is theirs) and no dialog is open. `action` null: Enter does nothing here.
 */
export function useEnterKey(action: (() => void) | null) {
  const current = useRef(action);
  current.current = action;
  const on = action !== null;
  useEffect(() => {
    if (!on) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.defaultPrevented || event.repeat) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as Element | null;
      if (target?.closest?.(OWN_ENTER)) return;
      if (document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      current.current?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [on]);
}
