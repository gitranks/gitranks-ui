'use client';

import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';
import { useEffect } from 'react';

// iPhone, iPod, iPad and Mac (iPadOS reports itself as a Mac): Apple platforms always draw flag emoji.
const APPLE_PLATFORM = /iPhone|iPod|iPad|Macintosh/;

/**
 * Loads a flag font where the system has no flag emoji (Windows). Never on Apple platforms: there
 * the polyfill's canvas check can report flags as missing, and WebKit then paints the text after
 * each flag in the flag's colours.
 */
export function FlagEmojiPolyfill() {
  useEffect(() => {
    if (APPLE_PLATFORM.test(navigator.userAgent)) {
      return;
    }

    polyfillCountryFlagEmojis();
  }, []);

  return null;
}
