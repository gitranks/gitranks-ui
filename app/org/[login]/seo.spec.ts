import { describe, expect, it, vi } from 'vitest';

import { buildOrgSEO } from './seo';

// The site origin is read once, when the module loads.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.test';
});

type Org = Parameters<typeof buildOrgSEO>[0];

const org = (overrides: Partial<Org> = {}) =>
  ({ login: 'vercel', name: 'Vercel', s: 500_000, rankOrg: { s: 12, sM: 13 }, ...overrides }) as Org;

const entityOf = (jsonLd: object[]) => (jsonLd[0] as { mainEntity: Record<string, unknown> }).mainEntity;

const card = 'https://gitranks.test/badge/org/vercel/org-card.png?size=social';
const avatar = 'https://gitranks.test/api/avatar/vercel';

describe('buildOrgSEO', () => {
  it("shows a ranked organization's card at 1200×630 in link previews", () => {
    const { metadata } = buildOrgSEO(org());

    expect(metadata.alternates?.canonical).toBe('/org/vercel');
    expect(metadata.openGraph).toMatchObject({
      type: 'profile',
      images: [{ url: card, width: 1200, height: 630, alt: 'Vercel on GitRanks' }],
    });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', images: metadata.openGraph?.images });
  });

  it('lists the avatar, then the card, as the organization image', () => {
    expect(entityOf(buildOrgSEO(org()).jsonLd).image).toEqual([avatar, card]);
  });

  it('falls back to the avatar for an organization without a rank', () => {
    for (const rankOrg of [null, { s: null, sM: null }]) {
      const { metadata, jsonLd } = buildOrgSEO(org({ rankOrg }));

      expect(metadata.openGraph).toMatchObject({ images: [avatar] });
      expect(entityOf(jsonLd).image).toBe(avatar);
    }
  });

  it('names the card after the login when the organization has no name', () => {
    expect(buildOrgSEO(org({ name: null })).metadata.openGraph).toMatchObject({
      images: [{ alt: 'vercel on GitRanks' }],
    });
  });

  it('has no metadata for an organization without a login', () => {
    expect(buildOrgSEO(org({ login: null }))).toEqual({ metadata: {}, jsonLd: [] });
  });
});
