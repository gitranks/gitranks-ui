import { describe, expect, it } from 'vitest';

import { isProfileOwner, profileIssuesUrl } from './profile-issues';

describe('who the profile blocks ask for', () => {
  it('is the signed-in owner alone, whatever the case of the login', () => {
    expect(isProfileOwner('octocat', 'octocat')).toBe(true);
    expect(isProfileOwner('OctoCat', 'octocat ')).toBe(true);
    expect(isProfileOwner('someone', 'octocat')).toBe(false);
    expect(isProfileOwner(undefined, 'octocat')).toBe(false);
    expect(isProfileOwner('octocat', null)).toBe(false);
    expect(isProfileOwner('', '')).toBe(false);
  });

  it("asks only on the owner's own profile, and nothing for a visitor or another login", () => {
    expect(profileIssuesUrl('octocat', 'octocat')).toBe('/api/me/contribute/issues?login=octocat');
    expect(profileIssuesUrl('OctoCat', 'octocat')).toBe('/api/me/contribute/issues?login=octocat');
    expect(profileIssuesUrl('someone', 'octocat')).toBeNull();
    expect(profileIssuesUrl(undefined, 'octocat')).toBeNull();
  });
});
