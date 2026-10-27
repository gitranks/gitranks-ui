import { describe, expect, it } from 'vitest';

import { builtByTiersText, shareWords } from './who-builds-it';

describe('shareWords', () => {
  it('names the common shares and gives a percentage otherwise', () => {
    expect(shareWords(0.5)).toBe('Half');
    expect(shareWords(0.33)).toBe('A third');
    expect(shareWords(0.25)).toBe('A quarter');
    expect(shareWords(0.41)).toBe('41%');
    expect(shareWords(0.003)).toBe('<1%');
  });
});

describe('builtByTiersText', () => {
  it('lists the three highest tiers present, highest first, in plural', () => {
    expect(
      builtByTiersText([
        { tier: 5, count: 38 },
        { tier: 7, count: 4 },
        { tier: 6, count: 11 },
        { tier: 1, count: 300 },
      ]),
    ).toBe('4 Legends, 11 Elites and 38 Masters');
    expect(builtByTiersText([{ tier: 4, count: 1 }])).toBe('1 Expert');
    expect(
      builtByTiersText([
        { tier: 4, count: 2 },
        { tier: 2, count: 5 },
      ]),
    ).toBe('2 Experts and 5 Adepts');
    expect(builtByTiersText([{ tier: 3, count: 4 }])).toBe('4 Advanced');
  });
});
