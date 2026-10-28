import { describe, expect, it, vi } from 'vitest';

import { buildRepoSEO, isRepoIndexed, isRepoRanked } from './seo';

// The site origin is read once, when the module loads.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.test';
});

type Repo = Parameters<typeof buildRepoSEO>[0];

const repo = (overrides: Partial<Repo> = {}): Repo => ({
  owner: 'vercel',
  name: 'next.js',
  nameWithOwner: 'vercel/next.js',
  ownerAvatarUrl: 'https://avatars.githubusercontent.com/u/14985020?v=4',
  description: 'The React Framework',
  language: 'JavaScript',
  stars: 130_000,
  gainedThisMonth: 1_250,
  createdAt: '2016-10-05T23:32:51.000Z',
  isArchived: false,
  isInOrganization: true,
  rank: { s: 12, sM: 14, l: 3, lM: 3, language: 'JavaScript' },
  ...overrides,
});

type Node = Record<string, unknown>;

const AVATAR = {
  '@type': 'ImageObject',
  '@id': 'https://gitranks.test/repo/vercel/next.js#avatar',
  url: 'https://gitranks.test/api/avatar/vercel',
  contentUrl: 'https://gitranks.test/api/avatar/vercel',
  caption: 'GitHub avatar of vercel, owner of vercel/next.js',
};
const CARD = {
  '@type': 'ImageObject',
  '@id': 'https://gitranks.test/repo/vercel/next.js#card',
  url: 'https://gitranks.test/badge/repo/vercel/next.js/rank-card.png?size=social',
  contentUrl: 'https://gitranks.test/badge/repo/vercel/next.js/rank-card.png?size=social',
  encodingFormat: 'image/png',
  width: 1200,
  height: 630,
  caption: 'vercel/next.js on GitRanks: repo rank #12',
};
const pageOf = (jsonLd: object[]) => jsonLd[0] as Node;
const sourceCodeOf = (jsonLd: object[]) => pageOf(jsonLd).mainEntity as Node;
const crumbsOf = (jsonLd: object[]) =>
  ((jsonLd[1] as Node).itemListElement as Node[]).map(({ position, name, item }) => ({ position, name, item }));

describe('buildRepoSEO', () => {
  it('canonicalizes to the stored name and describes the ranks and stars', () => {
    const { metadata } = buildRepoSEO(repo());

    expect(metadata.alternates?.canonical).toBe('/repo/vercel/next.js');
    expect(metadata.title).toBe('vercel/next.js - GitHub Repository Rank');
    expect(metadata.description).toBe(
      'Global rank: 12th. JavaScript rank: 3rd. 130K stars, +1.3K this month. The React Framework',
    );
    expect(metadata.robots).toMatchObject({ index: true, follow: true, 'max-image-preview': 'large' });
  });

  it("shows a ranked repository's rank card in link previews", () => {
    const { metadata } = buildRepoSEO(repo());

    expect(metadata.openGraph).toMatchObject({
      url: '/repo/vercel/next.js',
      images: [
        {
          url: 'https://gitranks.test/badge/repo/vercel/next.js/rank-card.png?size=social',
          width: 1200,
          height: 630,
          alt: 'vercel/next.js on GitRanks: repo rank #12',
        },
      ],
    });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', images: metadata.openGraph?.images });
  });

  it("falls back to the owner's avatar, from this site, when the repository has no rank card", () => {
    const unranked = buildRepoSEO(repo({ rank: { s: null, l: 3, language: 'JavaScript' } })).metadata;
    const avatar = { url: AVATAR.url, alt: AVATAR.caption };

    expect(unranked.openGraph).toMatchObject({ images: [avatar] });
    expect(unranked.twitter).toMatchObject({ card: 'summary_large_image', images: [avatar] });
    expect(buildRepoSEO(repo({ rank: null })).metadata.openGraph).toMatchObject({ images: [avatar] });

    const bare = buildRepoSEO(repo({ rank: null, ownerAvatarUrl: null })).metadata;
    expect(bare.openGraph?.images).toBeUndefined();
    expect(bare.twitter).toMatchObject({ card: 'summary' });
  });

  it('pairs the owner avatar with the rank card in JSON-LD, and keeps the avatar alone without a card', () => {
    expect(sourceCodeOf(buildRepoSEO(repo()).jsonLd).image).toEqual([AVATAR, CARD]);
    expect(sourceCodeOf(buildRepoSEO(repo({ rank: null })).jsonLd).image).toEqual(AVATAR);
    expect(sourceCodeOf(buildRepoSEO(repo({ ownerAvatarUrl: null })).jsonLd).image).toEqual(CARD);
  });

  it("names the owner's avatar, the image at the page's top, as the page's primary image", () => {
    expect(pageOf(buildRepoSEO(repo()).jsonLd).primaryImageOfPage).toEqual({ '@id': AVATAR['@id'] });
    expect(pageOf(buildRepoSEO(repo({ ownerAvatarUrl: null })).jsonLd).primaryImageOfPage).toBeUndefined();
  });

  it('names the ranking of repositories without a language', () => {
    const { metadata } = buildRepoSEO(repo({ language: null, rank: { s: 12, l: 3, language: null } }));

    expect(metadata.description).toBe(
      'Global rank: 12th. Rank without a language: 3rd. 130K stars, +1.3K this month. The React Framework',
    );
  });

  it('names the language when the language rank is in another one', () => {
    expect(buildRepoSEO(repo({ language: 'Go', rank: { s: 12, l: 3, language: null } })).metadata.description).toBe(
      'Global rank: 12th. Rank without a language: 3rd. 130K stars, +1.3K this month. Go. The React Framework',
    );
  });

  it('keeps a repository under the rank threshold out of the index', () => {
    const { metadata } = buildRepoSEO(repo({ stars: 4, gainedThisMonth: -2, rank: null }));

    expect(metadata.robots).toEqual({ index: false });
    expect(metadata.description).toBe('4 stars. JavaScript. The React Framework');
  });

  it('shows the ranks of a ranked repository under 100 stars but keeps its thin page out of the index', () => {
    const small = repo({ stars: 99, gainedThisMonth: null });

    expect(isRepoRanked(small)).toBe(true);
    expect(isRepoIndexed(small)).toBe(false);
    expect(buildRepoSEO(small).metadata.robots).toEqual({ index: false });
    expect(buildRepoSEO(small).metadata.description).toMatch(/^Global rank: /);
    expect(isRepoIndexed(repo({ stars: 100 }))).toBe(true);
  });

  it('keeps an unranked repository out of the index', () => {
    expect(isRepoRanked(repo({ rank: null }))).toBe(false);
    expect(buildRepoSEO(repo({ rank: null })).metadata.robots).toEqual({ index: false });
  });

  it('shows no rank for a repository that fell under the threshold', () => {
    expect(isRepoRanked(repo({ stars: 4 }))).toBe(false);
    expect(buildRepoSEO(repo({ stars: 4 })).metadata.description).toBe(
      '4 stars, +1.3K this month. JavaScript. The React Framework',
    );
  });

  it('describes the repository as source code with its owner and stars', () => {
    const { jsonLd } = buildRepoSEO(repo({ isArchived: true }));

    expect(pageOf(jsonLd)).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'ItemPage',
      url: 'https://gitranks.test/repo/vercel/next.js',
      name: 'vercel/next.js - GitHub Repository Rank',
    });
    expect(sourceCodeOf(jsonLd)).toEqual({
      '@type': 'SoftwareSourceCode',
      name: 'next.js',
      alternateName: 'vercel/next.js',
      description: 'The React Framework',
      url: 'https://gitranks.test/repo/vercel/next.js',
      image: [AVATAR, CARD],
      codeRepository: 'https://github.com/vercel/next.js',
      sameAs: ['https://github.com/vercel/next.js'],
      programmingLanguage: 'JavaScript',
      dateCreated: '2016-10-05T23:32:51.000Z',
      creativeWorkStatus: 'Archived',
      maintainer: {
        '@type': 'Organization',
        name: 'vercel',
        url: 'https://gitranks.test/org/vercel',
        image: { '@id': AVATAR['@id'] },
        sameAs: ['https://github.com/vercel'],
      },
      interactionStatistic: {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: 130_000,
      },
    });
  });

  it('leaves out the facts it does not have', () => {
    const sourceCode = sourceCodeOf(
      buildRepoSEO(
        repo({
          description: null,
          language: null,
          createdAt: 'not a date',
          ownerAvatarUrl: null,
          isInOrganization: null,
        }),
      ).jsonLd,
    );
    const serialized = JSON.parse(JSON.stringify(sourceCode));

    for (const key of ['description', 'programmingLanguage', 'dateCreated', 'maintainer', 'creativeWorkStatus']) {
      expect(serialized).not.toHaveProperty(key);
    }
  });

  it('makes a user the maintainer of a personal repository', () => {
    const maintainer = sourceCodeOf(
      buildRepoSEO(repo({ owner: 'octocat', isInOrganization: false, ownerAvatarUrl: null })).jsonLd,
    ).maintainer;

    expect(JSON.parse(JSON.stringify(maintainer))).toEqual({
      '@type': 'Person',
      name: 'octocat',
      url: 'https://gitranks.test/profile/octocat',
      sameAs: ['https://github.com/octocat'],
    });
  });

  it('puts the owner page between home and the repository in the breadcrumbs', () => {
    expect(crumbsOf(buildRepoSEO(repo()).jsonLd)).toEqual([
      { position: 1, name: 'Home', item: 'https://gitranks.test/' },
      { position: 2, name: 'vercel', item: 'https://gitranks.test/org/vercel' },
      { position: 3, name: 'next.js', item: 'https://gitranks.test/repo/vercel/next.js' },
    ]);
    expect(crumbsOf(buildRepoSEO(repo({ isInOrganization: null })).jsonLd)).toEqual([
      { position: 1, name: 'Home', item: 'https://gitranks.test/' },
      { position: 2, name: 'vercel/next.js', item: 'https://gitranks.test/repo/vercel/next.js' },
    ]);
  });
});
