import { describe, expect, it } from 'vitest';

import { contributeCards, HOME_NOW, homeProducts, learnCards } from './__fixtures__/products-block';
import {
  contributeCardOf,
  HOME_PROMOS,
  learnCardOf,
  needsYouLineOf,
  productsWordsOf,
  showsContributeOf,
} from './products-block-words';
import { needsYouRowWordsOf } from '@/lib/workspace/pull-request-list';

const uses = { usesContribute: true, usesLearn: true, contribute: null, learn: null };

describe('the promotions', () => {
  it('promote both products to a visitor and to someone who uses neither', () => {
    for (const products of [homeProducts.visitor, homeProducts.neither]) {
      expect(contributeCardOf(products)).toBe(HOME_PROMOS.CONTRIBUTE);
      expect(learnCardOf(products, HOME_NOW)).toBe(HOME_PROMOS.LEARN);
    }
    expect(HOME_PROMOS.CONTRIBUTE).toMatchObject({ mark: 'Beta', action: 'Start contributing', href: '/contribute' });
    expect(HOME_PROMOS.LEARN).toMatchObject({ mark: 'New', action: 'Start learning', href: '/learn' });
  });

  it('keep the other card a promotion for someone who uses one product', () => {
    expect(contributeCardOf(homeProducts.learner)).toBe(HOME_PROMOS.CONTRIBUTE);
    expect(learnCardOf(homeProducts.contributor, HOME_NOW)).toBe(HOME_PROMOS.LEARN);
  });
});

describe('needsYouLineOf', () => {
  it('words the first pull request as the list does, with its project and how many more', () => {
    const list = needsYouRowWordsOf({ box: 'ROUND_WAITING', round: 2 })?.line;
    expect(needsYouLineOf(contributeCards.needsYou, 2)).toBe(`${list}, in kelp-db/kelp, and 1 more.`);
    expect(needsYouLineOf({ ...contributeCards.needsYou, box: 'APPROVE' }, 1)).toBe(
      'Ready to open the pull request, in kelp-db/kelp.',
    );
    expect(needsYouLineOf({ ...contributeCards.needsYou, repo: null }, 4)).toBe(
      'Round 2: something to answer, and 3 more.',
    );
  });

  it('has a plain line when the box needs nothing', () => {
    expect(needsYouLineOf({ box: null, repo: null, round: null }, 2)).toBe('Open the list to see what each one needs.');
  });
});

describe('contributeCardOf', () => {
  it('says what needs the person first', () => {
    expect(contributeCardOf(homeProducts.contributor)).toMatchObject({
      mark: null,
      title: '2 pull requests need you',
      line: 'Round 2: something to answer, in kelp-db/kelp, and 1 more.',
      action: 'Open your pull requests',
      href: '/my/pull-requests',
      personal: true,
    });
    expect(contributeCardOf({ ...uses, contribute: { ...contributeCards.needsYou, count: 1 } }).title).toBe(
      '1 pull request needs you',
    );
  });

  it('then what is open, then new issues', () => {
    expect(contributeCardOf(homeProducts.open)).toMatchObject({
      title: '3 pull requests are open',
      line: 'They wait for their maintainers. Nothing is needed from you.',
      action: 'Open Contribute',
      href: '/contribute',
    });
    expect(contributeCardOf({ ...uses, contribute: { ...contributeCards.open, count: 1 } })).toMatchObject({
      title: '1 pull request is open',
      line: 'It waits for its maintainers. Nothing is needed from you.',
    });
    expect(contributeCardOf(homeProducts.quiet)).toMatchObject({
      title: 'New issues are ready for you',
      line: 'Picked for your languages and the projects you depend on.',
      action: 'Open Contribute',
    });
  });

  it('never shows a zero', () => {
    for (const count of [0, null, -1]) {
      const card = contributeCardOf({ ...uses, contribute: { ...contributeCards.needsYou, count } });
      expect(card.title).toBe('New issues are ready for you');
    }
  });

  it('keeps the promotion, leading into Contribute, with nothing on the card', () => {
    expect(contributeCardOf(uses)).toMatchObject({
      title: HOME_PROMOS.CONTRIBUTE.title,
      mark: null,
      action: 'Open Contribute',
      personal: false,
    });
  });
});

describe('learnCardOf', () => {
  it('says what is due today, then the next lesson', () => {
    expect(learnCardOf(homeProducts.learner, HOME_NOW)).toMatchObject({
      mark: null,
      title: '6 lessons to repeat today',
      line: 'Then your next lesson: Count things with a hash map.',
      action: 'Open Learn',
      href: '/learn',
      personal: true,
    });
    expect(learnCardOf({ ...uses, learn: learnCards.reviewDueNoNext }, HOME_NOW).line).toBe('');
    expect(learnCardOf({ ...uses, learn: { ...learnCards.reviewDue, count: 1 } }, HOME_NOW).title).toBe(
      '1 lesson to repeat today',
    );
  });

  it('then the next lesson, with its course and group', () => {
    expect(learnCardOf(homeProducts.open, HOME_NOW)).toMatchObject({
      title: 'Next lesson: Count things with a hash map',
      line: 'Algorithms and data structures · Hash maps and sets',
    });
  });

  it('then the next review, by the time given', () => {
    expect(learnCardOf(homeProducts.quiet, HOME_NOW)).toMatchObject({
      title: 'Nothing is due today',
      line: 'Your next review is in 2 days, with 3 lessons.',
    });
  });

  it('never shows a zero: a due count of none goes on to the next lesson', () => {
    expect(learnCardOf({ ...uses, learn: { ...learnCards.reviewDue, count: 0 } }, HOME_NOW).title).toBe(
      'Next lesson: Count things with a hash map',
    );
  });

  it('keeps the promotion, leading into Learn, for a learner with nothing to show', () => {
    for (const learn of [null, { ...learnCards.nextReview, at: null }, { ...learnCards.reviewDueNoNext, count: 0 }]) {
      expect(learnCardOf({ ...homeProducts.learnerNothing, learn }, HOME_NOW)).toMatchObject({
        title: HOME_PROMOS.LEARN.title,
        mark: null,
        action: 'Open Learn',
        href: '/learn',
      });
    }
  });
});

describe("the block's cards and words", () => {
  it("draws Contribute's card while Contribute is launched, and for a person who uses it before then", () => {
    expect(showsContributeOf(true, null)).toBe(true);
    expect(showsContributeOf(true, homeProducts.learner)).toBe(true);
    expect(showsContributeOf(false, null)).toBe(false);
    expect(showsContributeOf(false, homeProducts.learner)).toBe(false);
    expect(showsContributeOf(false, homeProducts.contributor)).toBe(true);
  });

  it('names both products over two cards, and Learn alone over its own card', () => {
    expect(productsWordsOf(true)).toEqual({
      heading: 'Contribute to open source, and learn from it',
      line: 'Both work with your own coding agent, on real issues in real projects.',
    });
    expect(productsWordsOf(false)).toEqual({
      heading: 'Learn from real open source',
      line: 'Short lessons, then real issues in real projects to use them on.',
    });
  });
});
