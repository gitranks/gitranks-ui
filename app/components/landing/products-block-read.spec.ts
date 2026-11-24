import { describe, expect, it } from 'vitest';

import { contributeCards, HOME_NOW, homeProducts, learnCards } from './__fixtures__/products-block';
import { HOME_CONTRIBUTE_STATES, HOME_LEARN_STATES, homeProductsOf } from './products-block-read';
import { contributeCardOf, HOME_PROMOS, learnCardOf } from './products-block-words';

const both = { usesContribute: true, usesLearn: true };

describe('homeProductsOf', () => {
  it('is null for no answer', () => {
    for (const raw of [null, undefined, 'x', 3, []]) expect(homeProductsOf(raw)).toBeNull();
  });

  it('keeps every fixture as the API sends it', () => {
    for (const products of Object.values(homeProducts)) {
      if (products) expect(homeProductsOf(products)).toEqual(products);
    }
  });

  it('leaves a card of a product the person does not use, or of a state it does not know, null', () => {
    expect(
      homeProductsOf({ usesContribute: false, usesLearn: true, contribute: contributeCards.needsYou, learn: null }),
    ).toEqual({ usesContribute: false, usesLearn: true, contribute: null, learn: null });
    expect(
      homeProductsOf({
        ...both,
        contribute: { state: 'SOMETHING_NEW' },
        learn: { ...learnCards.nextLesson, state: 7 },
      }),
    ).toEqual({ ...both, contribute: null, learn: null });
    expect(homeProductsOf({ usesContribute: 'yes', usesLearn: 1 })).toEqual({
      usesContribute: false,
      usesLearn: false,
      contribute: null,
      learn: null,
    });
  });

  it('drops fields of the wrong kind, and a lesson without its slug or title', () => {
    expect(
      homeProductsOf({
        ...both,
        contribute: { state: 'NEEDS_YOU', count: '2', repo: '', box: 4, round: Number.NaN },
        learn: { state: 'REVIEW_DUE', count: 6, lesson: { slug: 'x' }, course: 3, group: null, at: '' },
      }),
    ).toEqual({
      ...both,
      contribute: { state: 'NEEDS_YOU', count: null, repo: null, box: null, round: null },
      learn: { state: 'REVIEW_DUE', count: 6, lesson: null, course: null, group: null, at: null },
    });
  });
});

describe('every state of each card', () => {
  const contribute = {
    NEEDS_YOU: contributeCards.needsYou,
    OPEN: contributeCards.open,
    NEW_ISSUES: contributeCards.newIssues,
  };
  const learn = {
    REVIEW_DUE: learnCards.reviewDue,
    NEXT_LESSON: learnCards.nextLesson,
    NEXT_REVIEW: learnCards.nextReview,
  };

  it('lists each enum value once', () => {
    expect(HOME_CONTRIBUTE_STATES).toEqual(['NEEDS_YOU', 'OPEN', 'NEW_ISSUES']);
    expect(HOME_LEARN_STATES).toEqual(['REVIEW_DUE', 'NEXT_LESSON', 'NEXT_REVIEW']);
  });

  it("words each Contribute state as the person's own card", () => {
    const titles = HOME_CONTRIBUTE_STATES.map((state) => {
      const products = homeProductsOf({ ...both, contribute: contribute[state] });
      const card = contributeCardOf(products);
      expect(card.personal).toBe(true);
      expect(card.mark).toBeNull();
      expect(`${card.title} ${card.line}`).not.toMatch(/\b0\b/);
      return card.title;
    });
    expect(titles).toEqual(['2 pull requests need you', '3 pull requests are open', 'New issues are ready for you']);
  });

  it("words each Learn state as the person's own card", () => {
    const titles = HOME_LEARN_STATES.map((state) => {
      const card = learnCardOf(homeProductsOf({ ...both, learn: learn[state] }), HOME_NOW);
      expect(card.personal).toBe(true);
      expect(card.mark).toBeNull();
      expect(`${card.title} ${card.line}`).not.toMatch(/\b0\b/);
      return card.title;
    });
    expect(titles).toEqual([
      '6 lessons to repeat today',
      'Next lesson: Count things with a hash map',
      'Nothing is due today',
    ]);
  });

  it('keeps the promotions for a state it does not know', () => {
    const products = homeProductsOf({ ...both, contribute: { state: 'LATER' }, learn: { state: 'LATER' } });
    expect(contributeCardOf(products)).toMatchObject({ title: HOME_PROMOS.CONTRIBUTE.title, personal: false });
    expect(learnCardOf(products, HOME_NOW)).toMatchObject({ title: HOME_PROMOS.LEARN.title, personal: false });
  });
});
