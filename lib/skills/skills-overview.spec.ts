import { describe, expect, it } from 'vitest';

import type { SkillsOverviewMine } from './skills-overview';
import { overviewBlockOf, ownBlockOf, ownerBoxCaseOf } from './skills-overview';
import { contributorNumbers, learnerNumbers } from '@/lib/skills/__fixtures__/skills';

const mine = (patch: Partial<SkillsOverviewMine>): SkillsOverviewMine => ({
  state: 'PUBLIC',
  page: { login: 'octocat', numbers: learnerNumbers },
  usesContribute: false,
  usesLearn: true,
  ...patch,
});

const brief = { brief: { login: 'octocat', numbers: contributorNumbers } };

describe("the owner's own block on their overview", () => {
  it('is theirs only for a page they alone see: hidden, or private from an older API', () => {
    expect(ownBlockOf(mine({ state: 'HIDDEN' }))).toEqual({ numbers: learnerNumbers, state: 'HIDDEN' });
    expect(ownBlockOf(mine({ state: 'PRIVATE' }))).toEqual({ numbers: learnerNumbers, state: 'PRIVATE' });
  });

  it('is none on a page everyone sees, a page with nothing on it, and before the view is read', () => {
    for (const state of ['PUBLIC', 'NEW', 'NOTHING_YET'] as const) expect(ownBlockOf(mine({ state }))).toBeNull();
    expect(ownBlockOf(mine({ state: 'HIDDEN', page: null }))).toBeNull();
    expect(ownBlockOf(null)).toBeNull();
  });
});

describe('the Skills block on an overview', () => {
  it('draws the public numbers for everyone', () => {
    expect(overviewBlockOf(brief, null)).toEqual({ numbers: contributorNumbers, ownState: null });
  });

  it("draws the owner's own block, with its state, for a page only they see", () => {
    const own = { numbers: learnerNumbers, state: 'HIDDEN' as const };
    expect(overviewBlockOf({ brief: null }, own)).toEqual({ numbers: learnerNumbers, ownState: 'HIDDEN' });
    // A public copy kept from before the page was hidden gives way to the owner's own view.
    expect(overviewBlockOf(brief, own)?.ownState).toBe('HIDDEN');
  });

  it('is none without a public page, and before the numbers are read', () => {
    expect(overviewBlockOf({ brief: null }, null)).toBeNull();
    expect(overviewBlockOf(null, null)).toBeNull();
  });
});

describe("the owner's box, by the products they use", () => {
  const sides = (usesContribute: boolean, usesLearn: boolean) => ({ usesContribute, usesLearn });

  it("is Contribute's own box for someone who contributes or uses both, and when the sides cannot be read", () => {
    expect(ownerBoxCaseOf(sides(true, false))).toBe('contributes');
    expect(ownerBoxCaseOf(sides(true, true))).toBe('contributes');
    expect(ownerBoxCaseOf(null)).toBe('contributes');
  });

  it("is the top of a learner's own list", () => {
    expect(ownerBoxCaseOf(sides(false, true))).toBe('learns');
  });

  it('is issues picked for someone who uses neither', () => {
    expect(ownerBoxCaseOf(sides(false, false))).toBe('neither');
  });
});
