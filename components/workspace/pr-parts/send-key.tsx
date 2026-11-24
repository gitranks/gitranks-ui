'use client';

import { useEffect, useRef, useState } from 'react';

import { isSendKey, sendKeyNameOf } from '@/lib/workspace/pull-request-approve';

/**
 * The one key that sends, on Approve and for a round: Ctrl + Enter, or ⌘ + Enter on a Mac, wherever the focus is.
 * Enter alone does nothing. Nothing while a dialog is open, or with `null`.
 */
export function useSendKey(action: (() => void) | null) {
  const current = useRef(action);
  current.current = action;
  const on = action !== null;
  useEffect(() => {
    if (!on) return;
    const onKey = (event: KeyboardEvent) => {
      if (!isSendKey(event) || event.defaultPrevented || event.repeat) return;
      if (document.querySelector('[role="dialog"]')) return;
      event.preventDefault();
      current.current?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [on]);
}

/** The key's name beside Enter, read in the browser after mount: Ctrl until then. */
export function useSendKeyName() {
  const [name, setName] = useState('Ctrl');
  useEffect(() => setName(sendKeyNameOf(navigator.platform || navigator.userAgent)), []);
  return name;
}

/** The key that sends, inside a filled button: Ctrl ⏎, or ⌘ ⏎ on a Mac. Not on a phone. */
export function SendKey({ name }: { name: string }) {
  const key =
    'inline-grid h-[22px] min-w-[22px] place-items-center rounded-[5px] border border-b-2 border-primary-foreground/40 px-[5px] font-mono text-[11px] leading-none';
  return (
    <span aria-hidden="true" className="hidden items-center gap-1 sm:inline-flex" data-send-key="">
      <kbd className={key}>{name}</kbd>
      <kbd className={key}>⏎</kbd>
    </span>
  );
}
