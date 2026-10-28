import { describe, expect, it, vi } from 'vitest';

import { buildOrgSEO } from './seo';

// The site origin is read once, when the module loads.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.test';
});

type Org = Parameters<typeof buildOrgSEO>[0];

const org = (overrides: Partial<Org> = {}) =>
  ({ login: 'vercel', name: 'Vercel', s: 500_000, rankOrg: { s: 12, sM: 13 }, ...overrides }) as Org;

const pageOf = (jsonLd: object[]) => jsonLd[0] as Record<string, unknown>;
const entityOf = (jsonLd: object[]) => (jsonLd[0] as { mainEntity: Record<string, unknown> }).mainEntity;

const card = 'https://gitranks.test/badge/org/vercel/org-card.png?size=social';
const avatar = 'https://gitranks.test/api/avatar/vercel';

const AVATAR = {
  '@type': 'ImageObject',
  '@id': 'https://gitranks.test/org/vercel#avatar',
  url: avatar,
  contentUrl: avatar,
  caption: 'GitHub logo of Vercel (@vercel)',
};
const CARD = {
  '@type': 'ImageObject',
  '@id': 'https://gitranks.test/org/vercel#card',
  url: card,
  contentUrl: card,
  encodingFormat: 'image/png',
  width: 1200,
  height: 630,
  caption: 'Vercel on GitRanks: org rank #12',
};

describe('buildOrgSEO', () => {
  it("shows a ranked organization's card at 1200×630 in link previews", () => {
    const { metadata } = buildOrgSEO(org());

    expect(metadata.alternates?.canonical).toBe('/org/vercel');
    expect(metadata.openGraph).toMatchObject({
      type: 'profile',
      images: [{ url: card, width: 1200, height: 630, alt: 'Vercel on GitRanks: org rank #12' }],
    });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', images: metadata.openGraph?.images });
  });

  it('lists the avatar, then the card, as the organization image', () => {
    expect(entityOf(buildOrgSEO(org()).jsonLd).image).toEqual([AVATAR, CARD]);
  });

  it('describes the page as the organization profile, its avatar the primary image', () => {
    expect(pageOf(buildOrgSEO(org()).jsonLd)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      url: 'https://gitranks.test/org/vercel',
      name: 'Vercel - GitHub Analytics',
      description: 'Global rank: 12th. 500K stars.',
      primaryImageOfPage: { '@id': AVATAR['@id'] },
      mainEntity: {
        '@type': 'Organization',
        name: 'Vercel',
        alternateName: 'vercel',
        url: 'https://gitranks.test/org/vercel',
        image: [AVATAR, CARD],
        sameAs: ['https://github.com/vercel'],
      },
    });
  });

  it('falls back to the avatar for an organization without a rank', () => {
    for (const rankOrg of [null, { s: null, sM: null }]) {
      const { metadata, jsonLd } = buildOrgSEO(org({ rankOrg }));

      expect(metadata.openGraph).toMatchObject({ images: [{ url: avatar, alt: 'GitHub logo of Vercel (@vercel)' }] });
      expect(entityOf(jsonLd).image).toEqual(AVATAR);
    }
  });

  it('names the card after the login when the organization has no name', () => {
    expect(buildOrgSEO(org({ name: null })).metadata.openGraph).toMatchObject({
      images: [{ alt: 'vercel on GitRanks: org rank #12' }],
    });
    expect(entityOf(buildOrgSEO(org({ name: null })).jsonLd).image).toContainEqual({
      ...AVATAR,
      caption: 'GitHub logo of @vercel',
    });
  });

  it('has no metadata for an organization without a login', () => {
    expect(buildOrgSEO(org({ login: null }))).toEqual({ metadata: {}, jsonLd: [] });
  });
});
