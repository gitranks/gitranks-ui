import { describe, expect, it } from 'vitest';

import { countryInSentence } from './country-in-sentence';

describe('countryInSentence', () => {
  it.each([
    ['United States', 'the United States'],
    ['United Kingdom', 'the United Kingdom'],
    ['Netherlands', 'the Netherlands'],
    ['Philippines', 'the Philippines'],
    ['Czech Republic', 'the Czech Republic'],
    ['Cayman Islands', 'the Cayman Islands'],
    ['Democratic Republic of the Congo', 'the Democratic Republic of the Congo'],
    ['Germany', 'Germany'],
    ['Isle of Man', 'Isle of Man'],
  ])('%s → %s', (country, expected) => {
    expect(countryInSentence(country)).toBe(expected);
  });
});
