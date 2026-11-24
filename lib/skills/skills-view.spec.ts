import { describe, expect, it } from 'vitest';

import { contributorFixes, learnerPage, skillsMine } from './__fixtures__/skills';
import { mineAfterOf, moreFixesAfter, ownerLayerOf } from './skills-view';

describe("the owner's layer over a Skills address", () => {
  it('is nothing without the owner’s view', () => {
    expect(ownerLayerOf(null, true)).toEqual({ kind: 'none' });
    expect(ownerLayerOf(null, false)).toEqual({ kind: 'none' });
  });

  it('puts the strip over a page everyone sees, whatever the view says, so hiding changes only the strip', () => {
    for (const mine of [skillsMine.publicLearner, skillsMine.hiddenLearner, skillsMine.privateLearner]) {
      expect(ownerLayerOf(mine, true)).toEqual({ kind: 'strip', mine });
    }
  });

  it('puts the owner’s own page in place of the "no Skills page" end', () => {
    expect(ownerLayerOf(skillsMine.hiddenLearner, false)).toEqual({
      kind: 'own',
      mine: skillsMine.hiddenLearner,
      page: learnerPage,
    });
    expect(ownerLayerOf(skillsMine.privateLearner, false).kind).toBe('own');
    expect(ownerLayerOf(skillsMine.publicLearner, false).kind).toBe('own');
    expect(ownerLayerOf({ ...skillsMine.hiddenLearner, page: null }, false)).toEqual({ kind: 'none' });
  });

  it('shows what fills the page while nothing is on it', () => {
    for (const mine of [skillsMine.new, skillsMine.nothingYetBoth, skillsMine.nothingYetLearner]) {
      expect(ownerLayerOf(mine, false)).toEqual({ kind: 'start', mine });
    }
  });
});

describe('the owner’s view after hiding or showing', () => {
  it('is the API’s answer with the tab’s mark as this browser knows it, or the view before', () => {
    const before = { ...skillsMine.publicLearner, tabNew: false };
    const after = mineAfterOf(before, { ...skillsMine.hiddenLearner, tabNew: true });
    expect(after.state).toBe('HIDDEN');
    expect(after.tabNew).toBe(false);
    expect(mineAfterOf(before, null)).toBe(before);
  });
});

describe('"Show 20 more"', () => {
  it('adds the next fixes after the ones shown, once each, with the new total and cursor', () => {
    const shown = { rows: contributorFixes.slice(0, 2), total: 6, next: 'c2' };
    const next = { rows: contributorFixes.slice(1, 6), total: 6, next: null };
    const after = moreFixesAfter(shown, next);
    expect(after.rows.map((fix) => fix.number)).toEqual(contributorFixes.map((fix) => fix.number));
    expect(after.total).toBe(6);
    expect(after.next).toBeNull();
  });
});
