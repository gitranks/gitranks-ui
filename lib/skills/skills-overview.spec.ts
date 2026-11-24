import { describe, expect, it } from 'vitest';

import type { SkillsOverviewMine } from './skills-overview';
import { overviewBlockOf, ownBlockOf, ownerBoxCaseOf } from './skills-overview';
import { contributorNumbers, learnerNumbers } from '@/lib/skills/__fixtures__/skills';

const mine = (patch: Partial<SkillsOverviewMine>): SkillsOverviewMine => ({
  state: 'PUBLIC',
  page: { login: 'octocat', numbers: learnerNumbers },
  usesContribute: false,
  usesLearn: true,
  learnOpen: true,
  ...patch,
});

const brief = (learnOpen: boolean) => ({ brief: { login: 'octocat', numbers: contributorNumbers }, learnOpen });

describe("the owner's own block on their overview", () => {
  it('is theirs only for a page they alone see: hidden, or private', () => {
    expect(ownBlockOf(mine({ state: 'HIDDEN' }))).toEqual({
      numbers: learnerNumbers,
      state: 'HIDDEN',
      learnOpen: true,
    });
    expect(ownBlockOf(mine({ state: 'PRIVATE', learnOpen: false }))).toEqual({
      numbers: learnerNumbers,
      state: 'PRIVATE',
      learnOpen: false,
    });
  });

  it('is none on a page everyone sees, a page with nothing on it, and before the view is read', () => {
    for (const state of ['PUBLIC', 'NEW', 'NOTHING_YET'] as const) expect(ownBlockOf(mine({ state }))).toBeNull();
    expect(ownBlockOf(mine({ state: 'HIDDEN', page: null }))).toBeNull();
    expect(ownBlockOf(null)).toBeNull();
  });
});

describe('the Skills block on an overview', () => {
  it('draws the public numbers for everyone, with Learn’s words only while Learn is open to everyone', () => {
    expect(overviewBlockOf(brief(true), null)).toEqual({
      numbers: contributorNumbers,
      ownState: null,
      learnOpen: true,
    });
    expect(overviewBlockOf(brief(false), null)?.learnOpen).toBe(false);
  });

  it("draws the owner's own block, with its state, for a page only they see", () => {
    const own = { numbers: learnerNumbers, state: 'HIDDEN' as const, learnOpen: true };
    expect(overviewBlockOf({ brief: null, learnOpen: false }, own)).toEqual({
      numbers: learnerNumbers,
      ownState: 'HIDDEN',
      learnOpen: true,
    });
    // A public copy kept from before the page was hidden gives way to the owner's own view.
    expect(overviewBlockOf(brief(true), own)?.ownState).toBe('HIDDEN');
  });

  it('is none without a public page, and before the numbers are read', () => {
    expect(overviewBlockOf({ brief: null, learnOpen: true }, null)).toBeNull();
    expect(overviewBlockOf(null, null)).toBeNull();
  });
});

describe("the owner's box, by the products they use", () => {
  const sides = (usesContribute: boolean, usesLearn: boolean, learnOpen = true) => ({
    usesContribute,
    usesLearn,
    learnOpen,
  });

  it("is Contribute's own box for someone who contributes or uses both, and when the sides cannot be read", () => {
    expect(ownerBoxCaseOf(sides(true, false))).toBe('contributes');
    expect(ownerBoxCaseOf(sides(true, true))).toBe('contributes');
    expect(ownerBoxCaseOf(null)).toBe('contributes');
  });

  it("is the top of a learner's own list", () => {
    expect(ownerBoxCaseOf(sides(false, true))).toBe('learns');
  });

  it('is issues picked for someone who uses neither, or whose only side is Learn while it is closed to them', () => {
    expect(ownerBoxCaseOf(sides(false, false))).toBe('neither');
    expect(ownerBoxCaseOf(sides(false, false, false))).toBe('neither');
    expect(ownerBoxCaseOf(sides(false, true, false))).toBe('neither');
  });
});
