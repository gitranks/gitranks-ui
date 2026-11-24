import { describe, expect, it } from 'vitest';

import { isSkillsTag, skillsCardPath, skillsMarkdownPath, skillsPath, skillsProfilePath, skillsTag } from './paths';

describe("a Skills page's addresses", () => {
  it("lives under the person's profile, with its picture and its Markdown copy", () => {
    expect(skillsPath('octocat')).toBe('/profile/octocat/skills');
    expect(skillsCardPath('octocat')).toBe('/profile/octocat/skills/card.png');
    expect(skillsMarkdownPath('octocat')).toBe('/profile/octocat/skills.md');
  });

  it('keeps the case it is given, and encodes what a login cannot hold', () => {
    expect(skillsPath('OctoCat')).toBe('/profile/OctoCat/skills');
    expect(skillsPath('-Jerry-')).toBe('/profile/-Jerry-/skills');
    expect(skillsPath('a/b')).toBe('/profile/a%2Fb/skills');
  });
});

describe("a Skills page's cache tag", () => {
  it('is the login in lower case, as the expire route takes it', () => {
    expect(skillsTag('OctoCat')).toBe('skills:octocat');
    expect(isSkillsTag(skillsTag('OctoCat'))).toBe(true);
    expect(isSkillsTag(skillsTag('-Jerry-'))).toBe(true);
    expect(isSkillsTag(skillsTag('synchro--'))).toBe(true);
    expect(isSkillsTag(skillsTag('a'.repeat(39)))).toBe(true);
  });

  it.each([
    'skills',
    'skills:',
    'skills:OctoCat',
    'skills:octo.cat',
    'skills:octo_cat',
    'skills:octo/cat',
    `skills:${'a'.repeat(40)}`,
    'skills:octocat\n',
    ' skills:octocat',
    'Skills:octocat',
    'skills:page:octocat',
  ])('refuses %j', (tag) => {
    expect(isSkillsTag(tag)).toBe(false);
  });
});

describe('the profile a missing Skills page leads to', () => {
  it('is the person’s profile, with the login encoded', () => {
    expect(skillsProfilePath('octocat')).toBe('/profile/octocat');
    expect(skillsProfilePath('a b')).toBe('/profile/a%20b');
  });
});
