import { describe, expect, it } from 'vitest';

import { languageColorOf, languageColorsOf } from './language-colors';
import { DEFAULT_LANGUAGE_COLOR } from '@/app/app.consts';

describe('language colours', () => {
  it("colours an issue's language from the profile's own, else the site's grey", () => {
    const colors = languageColorsOf([
      { name: 'TypeScript', color: '#3178c6' },
      { name: 'typescript', color: '#000000' },
      { name: 'Go', color: null },
      null,
    ]);
    expect(colors).toEqual({ typescript: '#3178c6' });
    expect(languageColorOf('TypeScript', colors)).toBe('#3178c6');
    expect(languageColorOf('Go', colors)).toBe(DEFAULT_LANGUAGE_COLOR);
    expect(languageColorOf(null)).toBe(DEFAULT_LANGUAGE_COLOR);
  });
});
