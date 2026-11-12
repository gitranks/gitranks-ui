import { describe, expect, it } from 'vitest';

import { ownIssueOf, ownMatchOf, type ProfilePick } from './profile-picks';

const pick = (over: Partial<ProfilePick> = {}): ProfilePick => ({
  repo: 'o/r',
  number: 7,
  url: 'https://github.com/o/r/issues/7',
  title: 'Fix it',
  labels: [],
  language: 'js-ts',
  kind: 'bug',
  size: 'S',
  why: ['A maintainer asked for this change', 'Clear enough to start on'],
  testCommand: false,
  fit: 'language',
  repoLanguage: { name: 'TypeScript', color: '#3178c6' },
  ...over,
});

describe("the owner's block picks", () => {
  it("shows the repo's GitHub language and one reason", () => {
    expect(ownIssueOf(pick())).toEqual({
      repo: 'o/r',
      number: 7,
      url: 'https://github.com/o/r/issues/7',
      title: 'Fix it',
      language: { name: 'TypeScript', color: '#3178c6' },
      why: 'A maintainer asked for this change',
    });
  });

  it('says so when the pick is in a repo they contributed to', () => {
    expect(ownIssueOf(pick({ fit: 'contributed' })).why).toBe('You contributed to this repository');
  });

  it('names the languages the picks came from', () => {
    const go = { name: 'Go', color: '#00ADD8' };
    expect(ownMatchOf([pick(), pick({ repoLanguage: go }), pick()])).toBe('TypeScript and Go');
    expect(ownMatchOf([pick()])).toBe('TypeScript');
    expect(ownMatchOf([pick({ repoLanguage: null })])).toBeUndefined();
  });
});
