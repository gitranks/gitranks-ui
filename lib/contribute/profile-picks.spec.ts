import { describe, expect, it } from 'vitest';

import { ownIssueOf, ownMatchOf, type ProfilePick, profilePickOf } from './profile-picks';
import { maskedIssue } from '@/lib/workspace/__fixtures__/masked-issue';

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
      masked: null,
    });
  });

  it('carries a masked pick to its masked row', () => {
    const masked = maskedIssue();
    expect(ownIssueOf(pick({ masked })).masked).toEqual(masked);
  });

  it('shows a masked pick as the API answers it after the switch, its naming fields null, without failing', () => {
    const masked = maskedIssue();
    const answered = pick({ masked, repo: null, number: null, url: null, title: null, labels: null, why: null });
    for (const fit of ['language', 'contributed']) {
      expect(ownIssueOf({ ...answered, fit })).toEqual({
        repo: '',
        number: 0,
        url: '',
        title: null,
        language: { name: 'TypeScript', color: '#3178c6' },
        why: null,
        masked,
      });
    }
  });

  it('strips what names a masked pick before the browser gets it, and passes a named one on', () => {
    const masked = maskedIssue();
    expect(profilePickOf(pick({ masked }))).toEqual(
      pick({ masked, repo: null, number: null, url: null, title: null, labels: null, why: null }),
    );
    expect(profilePickOf(pick())).toEqual(pick());
    expect(ownIssueOf(pick({ masked }))).toEqual(ownIssueOf(profilePickOf(pick({ masked }))));
  });

  it('copes with a named pick that has no reasons', () => {
    expect(ownIssueOf(pick({ why: null })).why).toBeNull();
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
