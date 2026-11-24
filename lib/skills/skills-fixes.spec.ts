import { describe, expect, it } from 'vitest';

import {
  contributorFixes,
  hiddenPageFix,
  learnerFixes,
  longPage,
  SKILLS_LOGIN,
  SKILLS_NOW,
} from './__fixtures__/skills';
import {
  fixesLeftLineOf,
  fixesLineOf,
  fixLessonOf,
  fixLinksOf,
  fixStateWordsOf,
  moreFixesOf,
  namesProduct,
} from './skills-fixes';

describe('fixLinksOf', () => {
  it('links both of a Contribute fix to its timeline', () => {
    expect(fixLinksOf(contributorFixes[0])).toEqual({
      title: '/contribute/pr/harbor-kit/relay/58',
      made: '/contribute/pr/harbor-kit/relay/58',
    });
  });

  it('links a Learn fix’s title to its Learn page, and "How it was made" to the timeline', () => {
    expect(fixLinksOf(learnerFixes[0])).toEqual({
      title: '/learn/fixes/harbor-kit/relay/58',
      made: '/contribute/pr/harbor-kit/relay/58',
    });
    expect(fixLinksOf(learnerFixes[0], { learnOpen: false })).toEqual({
      title: '/contribute/pr/harbor-kit/relay/58',
      made: '/contribute/pr/harbor-kit/relay/58',
    });
  });

  it('links nothing of a fix whose page is hidden', () => {
    expect(fixLinksOf(hiddenPageFix)).toEqual({ title: null, made: null });
  });
});

describe('fixStateWordsOf', () => {
  it('says when it merged, in UTC, or that it is open', () => {
    expect(fixStateWordsOf(contributorFixes[0], SKILLS_NOW)).toBe('merged 20 Nov');
    expect(fixStateWordsOf(contributorFixes[4], SKILLS_NOW)).toBe('merged 14 Dec 2025');
    expect(fixStateWordsOf({ state: 'MERGED', mergedAt: null }, SKILLS_NOW)).toBe('merged');
    expect(fixStateWordsOf(contributorFixes[5], SKILLS_NOW)).toBe('open, in review');
  });
});

describe('fixLessonOf', () => {
  it('says a merged fix used its lesson, an open one uses it', () => {
    expect(fixLessonOf(learnerFixes[0])?.verb).toBe('Used');
    expect(fixLessonOf(learnerFixes[2])?.verb).toBe('Uses');
    expect(fixLessonOf(contributorFixes[0])).toBeNull();
  });
});

describe('fixesLineOf', () => {
  it('words the line by the products the fixes were made with', () => {
    expect(fixesLineOf(['CONTRIBUTE'], SKILLS_LOGIN)).toEqual([
      'Made with ',
      { product: 'CONTRIBUTE' },
      ': an AI agent wrote each fix, and octocat checked it before it was sent.',
    ]);
    expect(fixesLineOf(['LEARN'], SKILLS_LOGIN)[2]).toBe(
      ': an AI agent wrote each fix, and octocat answered questions about it before it was sent.',
    );
    expect(fixesLineOf(['LEARN', 'CONTRIBUTE'], SKILLS_LOGIN)).toEqual([
      'Made with ',
      { product: 'CONTRIBUTE' },
      ' or ',
      { product: 'LEARN' },
      ': an AI agent wrote each fix, and octocat checked it before it was sent.',
    ]);
    expect(namesProduct(['LEARN', 'CONTRIBUTE'])).toBe(true);
    expect(namesProduct(['LEARN'])).toBe(false);
  });
});

describe('moreFixesOf', () => {
  it('offers 20 more at most, and nothing at the end', () => {
    expect(moreFixesOf(longPage.fixes)).toBe('Show 20 more');
    expect(moreFixesOf({ ...longPage.fixes, total: 9 })).toBe('Show 3 more');
    expect(moreFixesOf({ ...longPage.fixes, next: null })).toBeNull();
    expect(moreFixesOf({ ...longPage.fixes, total: 6 })).toBeNull();
  });
});

describe('fixesLeftLineOf', () => {
  it('counts the fixes not listed yet, one or many, and says nothing when all are listed', () => {
    expect(fixesLeftLineOf(26, 6)).toBe('And 20 more, listed once your page is public.');
    expect(fixesLeftLineOf(7, 6)).toBe('And 1 more, listed once your page is public.');
    expect(fixesLeftLineOf(6, 6)).toBeNull();
    expect(fixesLeftLineOf(3, 6)).toBeNull();
  });
});
