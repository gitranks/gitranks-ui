'use client';

import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';
import { useEffect } from 'react';

export function FlagEmojiPolyfill() {
  useEffect(() => {
    polyfillCountryFlagEmojis();
  }, []);

  return null;
}
