import { describe, expect, it } from 'vitest';

import { missingHref } from './find-step';

describe('missingHref', () => {
  it("links a miss to the page that fetches it: a repository's, an organization's, else a profile", () => {
    expect(missingHref('acme/fastqueue', null)).toBe('/repo/acme/fastqueue');
    expect(missingHref('nebula', 'org')).toBe('/org/nebula');
    expect(missingHref('octo-dev', 'user')).toBe('/profile/octo-dev');
    expect(missingHref('octo-dev', null)).toBe('/profile/octo-dev');
  });
});
