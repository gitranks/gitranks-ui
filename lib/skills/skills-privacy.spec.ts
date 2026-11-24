import { describe, expect, it } from 'vitest';

import { skillsMine } from './__fixtures__/skills';
import { PRIVACY_UNREAD_LINE, privacyRowOf } from './skills-privacy';

describe('the Settings row "Your Skills page"', () => {
  it('offers Everyone or Only you on a page with something on it, the choice made now pressed', () => {
    expect(privacyRowOf(skillsMine.publicLearner)).toEqual({ line: 'Everyone can see it.', choice: { hidden: false } });
    expect(privacyRowOf(skillsMine.hiddenLearner)).toEqual({ line: 'Only you can see it.', choice: { hidden: true } });
  });

  it('says so, with no choice, while only its owner may see it', () => {
    expect(privacyRowOf(skillsMine.privateLearner)).toEqual({
      line: 'Only you can see it for now: what it shows is from GitRanks Learn, which is not open to everyone yet.',
      choice: null,
    });
  });

  it('says so, with no choice, while nothing is on it, naming Learn only where it is open', () => {
    for (const mine of [skillsMine.new, skillsMine.nothingYetBoth, skillsMine.nothingYetContributor]) {
      expect(privacyRowOf(mine)).toEqual({
        line: 'Nothing is on it yet. It shows to everyone from your first pull request sent or lesson learned.',
        choice: null,
      });
    }
    expect(privacyRowOf(skillsMine.newLearnClosed)?.line).toBe(
      'Nothing is on it yet. It shows to everyone from your first pull request sent.',
    );
  });

  it('has no row of its own when the view could not be read: the unread line takes its place', () => {
    expect(privacyRowOf(null)).toBeNull();
    expect(privacyRowOf(undefined)).toBeNull();
    expect(PRIVACY_UNREAD_LINE).toBe('Who can see it could not be read. Try again later.');
  });
});
