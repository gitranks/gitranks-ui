import { describe, expect, it } from 'vitest';

import { bothNumbers, contributorNumbers, firstFixNumbers, learnerNumbers, skillsMine } from './__fixtures__/skills';
import { blockLinkOf, blockOwnerLineOf, otherBoxOf, startOf, stripOf } from './skills-owner';

describe('stripOf', () => {
  it('gives a page everyone sees "Copy link" and "Hide this page"', () => {
    expect(stripOf(skillsMine.publicLearner)).toEqual({
      strong: 'Everyone can see this page.',
      rest: '',
      actions: ['copy', 'hide'],
      progress: '/learn/progress',
    });
  });

  it('gives a hidden page "Show it to everyone"', () => {
    expect(stripOf(skillsMine.hiddenLearner)).toMatchObject({
      strong: 'Only you can see this page.',
      actions: ['show'],
    });
  });

  it('links "Your progress" only for someone who learns', () => {
    expect(stripOf(skillsMine.publicFirstFix).progress).toBeNull();
    expect(stripOf(skillsMine.publicLearner).progress).toBe('/learn/progress');
  });

  it('says until when an empty page is only theirs', () => {
    expect(stripOf(skillsMine.new)).toEqual({
      strong: 'Only you can see this page',
      rest: ', until you send a pull request or learn a lesson.',
      actions: [],
      progress: null,
    });
  });
});

describe('startOf', () => {
  it('shows someone who uses neither both promotions and the numbers', () => {
    expect(startOf(skillsMine.new)).toEqual({
      heading: 'This page shows what you fix and learn with GitRanks',
      line: 'Fixes that real projects merged, and lessons you learned: a page you can show an employer.',
      numbers: true,
      boxes: [
        { product: 'CONTRIBUTE', mode: 'promo', onlyYou: false },
        { product: 'LEARN', mode: 'promo', onlyYou: false },
      ],
    });
  });

  it('gives each product used the step that puts the first thing on the page', () => {
    const both = startOf(skillsMine.nothingYetBoth);
    expect(both?.numbers).toBe(false);
    expect(both?.line).toMatch(/There are two ways to fill it, and you can use both\.$/);
    expect(both?.boxes.map((box) => box.mode)).toEqual(['step', 'step']);
    expect(startOf(skillsMine.nothingYetContributor)?.boxes.map((box) => box.mode)).toEqual(['step', 'promo']);
    expect(startOf(skillsMine.nothingYetContributor)?.line).not.toContain('two ways');
    expect(startOf(skillsMine.nothingYetLearner)?.line).not.toContain('two ways');
    expect(startOf(skillsMine.nothingYetLearner)?.boxes.map((box) => box.mode)).toEqual(['promo', 'step']);
  });

  it('has nothing for a page with something on it', () => {
    expect(startOf(skillsMine.publicLearner)).toBeNull();
  });
});

describe('otherBoxOf', () => {
  it('offers the product the owner does not use, only they see it', () => {
    expect(otherBoxOf(skillsMine.publicLearner)).toEqual({ product: 'CONTRIBUTE', mode: 'promo', onlyYou: true });
    expect(otherBoxOf(skillsMine.publicFirstFix)).toEqual({ product: 'LEARN', mode: 'promo', onlyYou: true });
  });

  it('offers nothing to someone of both', () => {
    expect(otherBoxOf(skillsMine.publicBoth)).toBeNull();
    expect(otherBoxOf(skillsMine.new)).toBeNull();
  });
});

describe('the block', () => {
  it('tells the owner of a page only they see', () => {
    expect(blockOwnerLineOf('HIDDEN')).toEqual({
      text: 'Only you see this block. Your Skills page is hidden.',
      link: 'Open your Skills page',
    });
    expect(blockOwnerLineOf('PUBLIC')).toBeNull();
  });

  it('names what the tab lists', () => {
    expect(blockLinkOf(contributorNumbers)).toBe('All 6 fixes');
    expect(blockLinkOf(firstFixNumbers)).toBe('See the fix');
    expect(blockLinkOf(bothNumbers)).toBe('All fixes and courses');
    expect(blockLinkOf(learnerNumbers)).toBe('All fixes and courses');
    expect(blockLinkOf({ ...learnerNumbers, fixes: 0 })).toBe('All 3 courses');
    expect(blockLinkOf({ fixes: 0, courses: 1 })).toBe('See the course');
    expect(blockLinkOf({ fixes: 0, courses: 0 })).toBeNull();
  });
});
