'use client';

import { useSyncExternalStore } from 'react';

/**
 * The one answer to "show key hints?" for the whole site: no where the main way in is touch, yes for a mouse or a
 * trackpad, and yes from the moment a real key is pressed (a keyboard on a tablet). Every hint and every line of keys
 * reads it. The server and the first paint say no, so a phone never flashes hints.
 */
export function useKeyHints(): boolean {
  return useSyncExternalStore(subscribe, keyHintsNow, noHints);
}

/** The pointer a mouse or a trackpad gives: fine, as the main one. */
const FINE_POINTER = '(pointer: fine)';

/** Whether a real key was pressed on this page: once true, true until the page is left. */
let keyPressed = false;
const listeners = new Set<() => void>();

/** The rule, pure: hints show for a fine main pointer, or once a real key was pressed. */
export const keyHintsOf = ({ finePointer, keyPressed }: { finePointer: boolean; keyPressed: boolean }): boolean =>
  finePointer || keyPressed;

/**
 * A key a keyboard pressed, not a phone's on-screen one: typed outside a field (an on-screen keyboard only opens for
 * one), and a key the browser can name (Android's on-screen keyboards send "Unidentified").
 */
export function isRealKey(event: Pick<KeyboardEvent, 'isTrusted' | 'key' | 'target'>): boolean {
  if (!event.isTrusted || !event.key || event.key === 'Unidentified') return false;
  const target = event.target as HTMLElement | null;
  if (!target || typeof target.closest !== 'function') return true;
  return !target.closest(
    'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]',
  );
}

function keyHintsNow(): boolean {
  return keyHintsOf({ finePointer: window.matchMedia(FINE_POINTER).matches, keyPressed });
}

const noHints = () => false;

function onKey(event: KeyboardEvent) {
  if (keyPressed || !isRealKey(event)) return;
  keyPressed = true;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  const pointer = window.matchMedia(FINE_POINTER);
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener('keydown', onKey, true);
  pointer.addEventListener('change', listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) window.removeEventListener('keydown', onKey, true);
    pointer.removeEventListener('change', listener);
  };
}

/** For specs: forget the key pressed. */
export function resetKeyHints(): void {
  keyPressed = false;
}
