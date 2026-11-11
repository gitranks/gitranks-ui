import { describe, expect, it } from 'vitest';

import { cardOfPick, isPoolLanguage, languagePicksUrl, ownMatchOf, profileLanguageOf } from './profile-picks';
import { OWN_PICKS, VISITOR_PICKS } from '@/app/profile/[login]/__fixtures__/contribute-block';

describe("a profile's main pool language", () => {
  it("is the first pool language of the owned repos' top 3, else of the contributed ones'", () => {
    expect(profileLanguageOf([{ name: 'CSS' }, { name: 'TypeScript' }], [{ name: 'Go' }])).toEqual({
      language: 'JS_TS',
      name: 'TypeScript',
    });
    expect(
      profileLanguageOf([{ name: 'CSS' }, { name: 'HTML' }, { name: 'Shell' }, { name: 'Go' }], [{ name: 'Rust' }]),
    ).toEqual({
      language: 'RUST',
      name: 'Rust',
    });
  });

  it('is null for a profile that writes none of them: no block', () => {
    expect(profileLanguageOf([{ name: 'C++' }], [])).toBeNull();
    expect(profileLanguageOf(null, undefined)).toBeNull();
  });
});

describe('the picks as cards', () => {
  it("puts the owner's fit first in the why line, and maps the API's language", () => {
    const card = cardOfPick(OWN_PICKS[1]);
    expect(card).toMatchObject({ nameWithOwner: 'kedacore/keda', number: 8239, language: 'GO', size: 'M' });
    expect(card.why).toBe('Your language: Go · Its maintainers review and merge outside pull requests');
    expect(cardOfPick({ ...OWN_PICKS[0], fit: 'contributed' }).why).toMatch(/^You contributed to this repository · /);
    expect(cardOfPick(VISITOR_PICKS[0]).why).toBe('A maintainer asked for this change · Clear enough to start on');
  });

  it("says what the owner's picks were matched to", () => {
    expect(ownMatchOf(OWN_PICKS)).toBe('your JavaScript / TypeScript, Go and Rust');
    expect(ownMatchOf([{ ...OWN_PICKS[0], fit: 'contributed' }, OWN_PICKS[1]])).toBe(
      'repos you contributed to and your Go',
    );
    expect(ownMatchOf([{ ...OWN_PICKS[0], fit: 'contributed' }])).toBe('repos you contributed to');
  });

  it('asks by language alone', () => {
    expect(languagePicksUrl('JS_TS')).toBe('/api/contribute/language-picks?language=JS_TS');
    expect(isPoolLanguage('GO')).toBe(true);
    expect(isPoolLanguage('go')).toBe(false);
    expect(isPoolLanguage(null)).toBe(false);
  });
});
