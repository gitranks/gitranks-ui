import { describe, expect, it } from 'vitest';

import { buildProfileTabSEO } from './seo';

type User = Parameters<typeof buildProfileTabSEO>[1];

const user = (overrides: Partial<User> = {}): User => ({
  githubId: '1',
  login: 'Octo-Cat',
  name: 'Octo Cat',
  country: 'Germany',
  websiteUrl: 'octo.example',
  socialAccounts: {
    totalCount: 2,
    nodes: [
      { provider: 'TWITTER', displayName: '@octo', url: 'https://twitter.com/octo' },
      { provider: 'GENERIC', displayName: 'broken', url: 'not a url' },
    ],
  },
  rankGlobal: { s: 10, c: 20, f: 30 },
  rankCountry: { s: 1, c: 2, f: 3 },
  ...overrides,
});

const personOf = (jsonLd: object[]) => (jsonLd[0] as { mainEntity: Record<string, unknown> }).mainEntity;

describe('buildProfileTabSEO', () => {
  it('canonicalizes to the stored login', () => {
    const { metadata } = buildProfileTabSEO('ranks', user());

    expect(metadata.alternates?.canonical).toBe('/profile/Octo-Cat/ranks');
    expect(metadata.title).toBe('Octo-Cat (Octo Cat) - Ranks');
  });

  it('titles and canonicalizes the country variant', () => {
    const { metadata } = buildProfileTabSEO('ranks', user(), 'country');

    expect(metadata.alternates?.canonical).toBe('/profile/Octo-Cat/ranks/country');
    expect(metadata.title).toBe('Octo-Cat (Octo Cat) - Ranks in Germany');
    expect(metadata.description).toBe('Ranks in Germany: Stars Rank 1st. Contributor Rank 2nd. Followers Rank 3rd.');
  });

  it('points a country variant without a country at the global tab', () => {
    const { metadata } = buildProfileTabSEO('overview', user({ country: null }), 'country');

    expect(metadata.alternates?.canonical).toBe('/profile/Octo-Cat');
  });

  it('describes the person with the login as a fallback name and valid sameAs links', () => {
    const person = personOf(buildProfileTabSEO('overview', user({ name: '' })).jsonLd);

    expect(person.name).toBe('Octo-Cat');
    expect(person.alternateName).toBe('Octo-Cat');
    expect(person.sameAs).toEqual(['https://github.com/Octo-Cat', 'https://octo.example', 'https://twitter.com/octo']);
  });
});
