import { describe, expect, it } from 'vitest';

import { hasSessionHint } from './session-hint';

describe('hasSessionHint', () => {
  it.each(['has-session=1', 'theme=dark; has-session=1', 'has-session=1;theme=dark'])(
    'finds the hint in %j',
    (cookie) => {
      expect(hasSessionHint(cookie)).toBe(true);
    },
  );

  it.each(['', 'theme=dark', 'not-has-session=1', 'has-session-old=1'])('finds no hint in %j', (cookie) => {
    expect(hasSessionHint(cookie)).toBe(false);
  });
});
