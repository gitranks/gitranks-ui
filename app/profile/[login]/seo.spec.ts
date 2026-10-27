import { describe, expect, it, vi } from 'vitest';

import { buildProfileTabSEO } from './seo';

// The site origin is read once, when the module loads.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.test';
});

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

  describe('link preview and JSON-LD image', () => {
    const card = 'https://gitranks.test/badge/user/Octo-Cat/profile-card.png?size=social';
    const avatar = 'https://gitranks.test/api/avatar/Octo-Cat';
    const ranked = (overrides: Partial<User> = {}) => user({ s: 120, c: 40, f: 3, ...overrides });

    it("shows a ranked developer's profile card at 1200×630 on every tab", () => {
      for (const tab of ['overview', 'ranks', 'repositories', 'languages'] as const) {
        const { metadata } = buildProfileTabSEO(tab, ranked());

        expect(metadata.openGraph).toMatchObject({
          type: 'profile',
          images: [{ url: card, width: 1200, height: 630, alt: 'Octo-Cat on GitRanks' }],
        });
        expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', images: metadata.openGraph?.images });
      }
    });

    it('lists the avatar, then the card, as the person image', () => {
      expect(personOf(buildProfileTabSEO('overview', ranked()).jsonLd).image).toEqual([avatar, card]);
    });

    it('takes the card from the contributions ranking alone', () => {
      const { metadata } = buildProfileTabSEO('overview', ranked({ s: 2, rankGlobal: { s: null, c: 20 } }));

      expect(metadata.openGraph).toMatchObject({ images: [{ url: card }] });
    });

    it('falls back to the avatar for a developer in neither the stars nor the contributions ranking', () => {
      const followersOnly = ranked({ s: 2, c: 1, f: 900 });
      const { metadata, jsonLd } = buildProfileTabSEO('overview', followersOnly);

      expect(metadata.openGraph).toMatchObject({ images: [avatar] });
      expect(personOf(jsonLd).image).toBe(avatar);
    });

    it('falls back to the avatar when the scores qualify but the global ranks are not there yet', () => {
      expect(buildProfileTabSEO('overview', ranked({ rankGlobal: null })).metadata.openGraph).toMatchObject({
        images: [avatar],
      });
      expect(
        buildProfileTabSEO('overview', ranked({ rankGlobal: { s: null, sProvisional: 40 } })).metadata.openGraph,
      ).toMatchObject({ images: [{ url: card }] });
    });

    it('judges the card by the scores on a tab that does not read the global ranks', () => {
      const { metadata } = buildProfileTabSEO('ranks', ranked({ rankGlobal: undefined }), 'country');

      expect(metadata.openGraph).toMatchObject({ images: [{ url: card }] });
    });
  });
});
