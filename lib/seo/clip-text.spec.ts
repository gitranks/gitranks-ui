import { describe, expect, it } from 'vitest';

import { clipText } from './clip-text';

describe('clipText', () => {
  it('keeps text that fits', () => {
    expect(clipText('short text', 20)).toBe('short text');
    expect(clipText('exactly ten', 11)).toBe('exactly ten');
  });

  it('cuts at the last space in the second half', () => {
    expect(clipText('one two three four five six', 16)).toBe('one two three…');
  });

  it('cuts mid-word when no space falls in the second half', () => {
    expect(clipText('a abcdefghijklmnopqrstuvwxyz', 10)).toBe('a abcdefg…');
  });

  it('never splits an emoji', () => {
    const clipped = clipText(`${'x'.repeat(66)}🚀🚀🚀🚀🚀🚀`, 70);

    expect(clipped).toBe(`${'x'.repeat(66)}🚀🚀🚀…`);
    expect(clipped).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
  });

  it('counts a multi-code-point emoji as one character', () => {
    const family = '👨‍👩‍👧';

    expect(clipText(`ab${family}${family}cd`, 4)).toBe(`ab${family}…`);
  });
});
