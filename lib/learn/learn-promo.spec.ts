import { describe, expect, it } from 'vitest';

import {
  languageColorOf,
  languageColorsOf,
  learnPromoUrl,
  learnRecordOf,
  learnRecordUrl,
  ownerIssueOf,
  promoPlacementOf,
  promoTitleOf,
  reasonLineOf,
  recordTopicsOf,
  shownPromoOf,
} from './learn-promo';
import { DEFAULT_LANGUAGE_COLOR } from '@/app/app.consts';

const issue = (number: number, extra: Record<string, unknown> = {}) => ({
  title: `Issue ${number}`,
  repo: 'o/r',
  number,
  language: 'TypeScript',
  topic: 'cache keys',
  ...extra,
});

describe('which Learn suggestion shows', () => {
  it('shows one only when Learn is open to the viewer and the API says to', () => {
    const learnPromo = { show: true, reason: 'Why.', language: 'Go', issues: [] };
    expect(shownPromoOf({ learnOpen: true, learnPromo })).toEqual({ reason: 'Why.', language: 'Go', issues: [] });
    expect(shownPromoOf({ learnOpen: false, learnPromo })).toBeNull();
    expect(shownPromoOf({ learnOpen: true, learnPromo: { ...learnPromo, show: false } })).toBeNull();
    expect(shownPromoOf({ learnOpen: true, learnPromo: null })).toBeNull();
    expect(shownPromoOf({ learnPromo })).toBeNull();
    expect(shownPromoOf(null)).toBeNull();
  });

  it('keeps up to three whole issues, with their text trimmed and blanks as none', () => {
    const promo = shownPromoOf({
      learnOpen: true,
      learnPromo: {
        show: true,
        reason: '  ',
        language: ' TypeScript ',
        issues: [
          issue(1, { title: ' First ', topic: '' }),
          issue(0),
          issue(2, { repo: '' }),
          issue(3, { language: null }),
          issue(4),
          issue(5),
        ],
      },
    });
    expect(promo).toEqual({
      reason: null,
      language: 'TypeScript',
      issues: [{ ...issue(1), title: 'First', topic: null }, { ...issue(3), language: null }, issue(4)],
    });
  });

  it('reads the placement from the address, and nothing else', () => {
    expect(promoPlacementOf('landing')).toBe('LANDING');
    expect(promoPlacementOf('profile')).toBe('PROFILE');
    expect(promoPlacementOf('LANDING')).toBeNull();
    expect(promoPlacementOf(null)).toBeNull();
  });

  it('asks on the home page for any signed-in viewer, and on a profile only for its owner', () => {
    expect(learnPromoUrl('LANDING', 'OctoCat')).toBe('/api/me/learn/promo?placement=landing&login=OctoCat');
    expect(learnPromoUrl('PROFILE', 'OctoCat', 'octocat')).toBe('/api/me/learn/promo?placement=profile&login=OctoCat');
    expect(learnPromoUrl('PROFILE', 'someone', 'octocat')).toBeNull();
    expect(learnPromoUrl('PROFILE', 'octocat')).toBeNull();
    expect(learnPromoUrl('LANDING', null)).toBeNull();
    expect(learnPromoUrl('LANDING', ' ')).toBeNull();
  });

  it('says why and what it is about', () => {
    expect(promoTitleOf('TypeScript')).toBe('Learn TypeScript on real issues');
    expect(promoTitleOf(null)).toBe('Learn on real open-source issues');
    expect(reasonLineOf('You started your first Go repo 3 weeks ago')).toBe(
      'You started your first Go repo 3 weeks ago.',
    );
    expect(reasonLineOf('Your account is new!')).toBe('Your account is new!');
    expect(reasonLineOf(null)).toBeNull();
  });

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

describe("the suggestion's issues as the owner's block lists them", () => {
  it('links the issue on GitHub, colours its language and names the lesson', () => {
    expect(ownerIssueOf(issue(7), { typescript: '#3178c6' })).toEqual({
      repo: 'o/r',
      number: 7,
      url: 'https://github.com/o/r/issues/7',
      title: 'Issue 7',
      language: { name: 'TypeScript', color: '#3178c6' },
      why: 'Lesson: cache keys',
    });
    expect(ownerIssueOf({ ...issue(8), language: null, topic: null })).toMatchObject({ language: null, why: null });
  });
});

describe('the Learn record', () => {
  it('is left out without a record or without a lesson', () => {
    expect(learnRecordOf(null)).toBeNull();
    expect(learnRecordOf(undefined)).toBeNull();
    expect(learnRecordOf({ lessons: 0, topics: ['A'], prsOpened: 1, prsMerged: 0 })).toBeNull();
  });

  it('keeps each topic once and counts below zero as none', () => {
    expect(learnRecordOf({ lessons: 2, topics: ['A', ' A ', '', 'B'], prsOpened: -1, prsMerged: 1 })).toEqual({
      lessons: 2,
      topics: ['A', 'B'],
      prsOpened: 0,
      prsMerged: 1,
    });
  });

  it('names five topics and counts the rest', () => {
    expect(recordTopicsOf(['a', 'b', 'c'])).toEqual({ shown: ['a', 'b', 'c'], more: 0 });
    expect(recordTopicsOf(['a', 'b', 'c', 'd', 'e', 'f', 'g'])).toEqual({ shown: ['a', 'b', 'c', 'd', 'e'], more: 2 });
  });

  it('is read at the login, and never at anything else', () => {
    expect(learnRecordUrl('OctoCat')).toBe('/api/learn/record/octocat');
    expect(learnRecordUrl('../x')).toBeNull();
    expect(learnRecordUrl('')).toBeNull();
  });
});
