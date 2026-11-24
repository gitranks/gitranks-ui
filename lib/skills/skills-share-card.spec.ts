import { describe, expect, it } from 'vitest';

import {
  bothPage,
  contributorPage,
  firstFixPage,
  firstLessonPage,
  learnerPage,
  openOnlyNumbers,
} from './__fixtures__/skills';
import {
  type SkillsCard,
  skillsCardAddressOf,
  skillsCardAddressSize,
  skillsCardAltOf,
  skillsCardOf,
  skillsCardSentenceOf,
  skillsCardSentenceSize,
  skillsCardUrlOf,
  skillsCardVersionOf,
} from './skills-share-card';

const LONG_LOGIN = 'a-very-long-github-login-of-39-chars-xy';

const words = (card: SkillsCard | null) => card?.figures.map((figure) => `${figure.value} ${figure.label}`);

describe("a Skills page's picture", () => {
  it('says one sentence about the person by kind', () => {
    expect(skillsCardSentenceOf('CONTRIBUTOR')).toBe('fixes real issues in open-source projects');
    expect(skillsCardSentenceOf('LEARNER')).toBe('is learning from real open-source fixes');
    expect(skillsCardSentenceOf('BOTH')).toBe('fixes real open-source issues and learns from them');
    expect(skillsCardOf(bothPage, true)?.sentence).toBe('fixes real open-source issues and learns from them');
    expect(skillsCardAltOf({ login: 'octocat', sentence: 'is learning from real open-source fixes' })).toBe(
      'octocat is learning from real open-source fixes',
    );
  });

  it("draws the block's figures, three at most, worded as the block words them, singular for one", () => {
    expect(words(skillsCardOf(contributorPage, true))).toEqual([
      '5 fixes merged',
      '41 days active',
      '4 said a fix helped',
    ]);
    expect(words(skillsCardOf(learnerPage, true))).toEqual(['103 lessons learned', '2 mastered', '64 days active']);
    expect(words(skillsCardOf(bothPage, true))).toEqual(['3 fixes merged', '103 lessons learned', '78 days active']);
    expect(words(skillsCardOf(firstLessonPage, true))).toEqual(['1 lesson learned', '1 day active']);
    const open = skillsCardOf({ login: 'octocat', numbers: openOnlyNumbers }, true);
    expect(words(open)).toEqual(['2 pull requests open', '4 days active', 'Codex AI agent used']);
  });

  it('draws the agent by name, not in mono, where nobody said a fix helped', () => {
    const card = skillsCardOf(firstFixPage, true);
    expect(card?.figures.map((figure) => [figure.key, figure.value, figure.mono])).toEqual([
      ['FIXES_MERGED', '1', true],
      ['DAYS_ACTIVE', '3', true],
      ['AGENT', 'Claude Code', false],
    ]);
  });

  it('leaves out a figure with nothing in it, and never draws more than three', () => {
    const numbers = {
      ...contributorPage.numbers,
      blockFigures: [
        { key: 'FIXES_MERGED' as const, value: 0, second: 0, name: null, also: null },
        ...contributorPage.numbers.figures,
      ],
    };
    expect(words(skillsCardOf({ login: 'octocat', numbers }, true))).toEqual([
      '5 fixes merged',
      '41 days active',
      '4 said a fix helped',
    ]);
  });

  it('holds nothing of Learn while Learn is not open to everyone, and is no picture when nothing is left', () => {
    const both = skillsCardOf(bothPage, false);
    expect(both?.sentence).toBe('fixes real issues in open-source projects');
    expect(words(both)).toEqual(['3 fixes merged']);
    expect(skillsCardOf(learnerPage, false)).toBeNull();
    expect(
      skillsCardOf({ ...contributorPage, numbers: { ...contributorPage.numbers, blockFigures: [] } }, true),
    ).toBeNull();
  });

  it("prints the page's address, and makes the sentence and the address smaller for a long login", () => {
    expect(skillsCardAddressOf('octocat')).toBe('gitranks.com/profile/octocat/skills');
    expect(skillsCardOf(contributorPage, true)?.address).toBe('gitranks.com/profile/octocat/skills');
    expect(skillsCardSentenceSize('octocat')).toBe(60);
    expect(skillsCardSentenceSize('a-twenty-char-login1')).toBe(52);
    expect(skillsCardSentenceSize(LONG_LOGIN)).toBe(44);
    expect(skillsCardAddressSize('octocat')).toBe(24);
    expect(skillsCardAddressSize(LONG_LOGIN)).toBe(20);
  });

  it('lives at one address under a version that changes with anything it draws', () => {
    const card = skillsCardOf(contributorPage, true) as SkillsCard;
    const version = skillsCardVersionOf(card);
    expect(version).toMatch(/^[0-9a-z]{1,7}$/);
    expect(skillsCardVersionOf({ ...card })).toBe(version);
    expect(skillsCardUrlOf(card)).toBe(`/profile/octocat/skills/card.png?v=${version}`);
    expect(skillsCardVersionOf({ ...card, login: 'octocat2' })).not.toBe(version);
    expect(skillsCardVersionOf({ ...card, sentence: skillsCardSentenceOf('BOTH') })).not.toBe(version);
    const more = { ...card, figures: card.figures.map((figure, at) => (at ? figure : { ...figure, value: '6' })) };
    expect(skillsCardVersionOf(more)).not.toBe(version);
  });
});
