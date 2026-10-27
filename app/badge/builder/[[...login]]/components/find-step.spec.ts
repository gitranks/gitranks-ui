import { describe, expect, it } from 'vitest';

import { findHeading, missingHref } from './find-step';
import { findBadge } from '@/badge/v3/catalogue';

describe('missingHref', () => {
  it("links a miss to the page that fetches it: a repository's, an organization's, else a profile", () => {
    expect(missingHref('acme/fastqueue', null)).toBe('/repo/acme/fastqueue');
    expect(missingHref('nebula', 'org')).toBe('/org/nebula');
    expect(missingHref('octo-dev', 'user')).toBe('/profile/octo-dev');
    expect(missingHref('octo-dev', null)).toBe('/profile/octo-dev');
  });
});

describe('findHeading', () => {
  it('names the badge picked before the entity, by its kind', () => {
    expect(findHeading('repo', findBadge('repo', 'star-history'))).toBe(
      'Find your repository for the “star history” chart',
    );
    expect(findHeading('user', findBadge('user', 'rank'))).toBe('Find your GitHub account for the “stars rank” badge');
    expect(findHeading('org', findBadge('org', 'org-card'))).toBe('Find your organization for the “organization” card');
  });

  it('asks plainly without a badge', () => {
    expect(findHeading(null, null)).toBe('Who is the badge for?');
    expect(findHeading('repo', null)).toBe('Which repository is the badge for?');
  });
});
