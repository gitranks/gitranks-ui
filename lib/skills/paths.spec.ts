import { describe, expect, it } from 'vitest';

import {
  isSkillsCardPath,
  isSkillsTag,
  SKILLS_LOGINS_TAG,
  skillsCardPath,
  skillsMarkdownPath,
  skillsPath,
  skillsProfilePath,
  skillsTag,
} from './paths';

describe("a Skills page's addresses", () => {
  it("lives under the person's profile, with its picture and its Markdown copy", () => {
    expect(skillsPath('octocat')).toBe('/profile/octocat/skills');
    expect(skillsCardPath('octocat')).toBe('/profile/octocat/skills/card.png');
    expect(skillsMarkdownPath('octocat')).toBe('/profile/octocat/skills.md');
  });

  it('knows its picture by its path alone', () => {
    expect(isSkillsCardPath(skillsCardPath('octocat'))).toBe(true);
    for (const path of [
      '/profile/octocat/skills',
      '/profile/octocat/skills/card.png/',
      '/profile/a/b/skills/card.png',
    ]) {
      expect(isSkillsCardPath(path), path).toBe(false);
    }
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

describe("a Skills page's reads in the browser", () => {
  it('reads the numbers and the next fixes of a login, and the owner’s own view under the session’s routes', async () => {
    const paths = await import('./paths');
    expect(paths.skillsBriefApiPath('octocat')).toBe('/api/skills/octocat');
    expect(paths.skillsFixesApiPath('octocat', 'c+1/=')).toBe('/api/skills/octocat/fixes?after=c%2B1%2F%3D');
    expect(paths.SKILLS_MINE_PATH).toBe('/api/me/skills');
    expect(paths.SKILLS_TAB_MINE_PATH).toBe('/api/me/skills/tab');
    expect(paths.SKILLS_SEEN_MINE_PATH).toBe('/api/me/skills/seen');
  });

  it("reads what the owner's profile overview shows them for the profile's login, trimmed", async () => {
    const paths = await import('./paths');
    expect(paths.skillsProfileMinePath(' Octo-Cat ')).toBe('/api/me/skills/profile?login=Octo-Cat');
  });
});

describe('SKILLS_LOGINS_TAG', () => {
  it('is not a page tag, so only this site expires it', () => {
    expect(SKILLS_LOGINS_TAG).toBe('skills-logins');
    expect(isSkillsTag(SKILLS_LOGINS_TAG)).toBe(false);
  });
});
