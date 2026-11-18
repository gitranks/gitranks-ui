import { describe, expect, it, vi } from 'vitest';

import { buildContributorsSEO, buildUsedBySEO, PACKAGES_UNAVAILABLE_TEXT } from './tab-seo';
import { dependentRows, fivePackages, noDependents, threePackages } from '@/components/dependents/dependents.fixtures';
import { facts } from '@/components/pulse/pulse.fixtures';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.test';
});

const repo = {
  owner: 'nebula',
  name: 'ui',
  nameWithOwner: 'nebula/ui',
  rank: { s: 1_204, sM: 1_250, l: 112, lM: 118, language: 'TypeScript' },
};

type Node = Record<string, unknown>;
const ofType = (jsonLd: object[], type: string) => jsonLd.find((node) => (node as Node)['@type'] === type) as Node;

describe('buildUsedBySEO', () => {
  it('titles and describes the tab by its numbers, canonical at its own address', () => {
    const { metadata, jsonLd } = buildUsedBySEO(repo, threePackages, dependentRows);

    expect(metadata.title).toBe('Who uses nebula/ui: 231 repositories with 100+ stars');
    expect(metadata.description).toBe(
      '231 repositories with 100+ stars depend on @nebula/ui, @nebula/icons and @nebula/tokens. The most-starred is orbit-hq/console (48,210 stars). 527,322…',
    );
    expect(metadata.alternates?.canonical).toBe('/repo/nebula/ui/used-by');
    expect(metadata.robots).toMatchObject({ index: true });
    expect(JSON.stringify(metadata.openGraph?.images)).toContain('/badge/repo/nebula/ui/rank-card.png?size=social');

    const list = ofType(jsonLd, 'ItemList');
    expect((list.itemListElement as Node[])[0]).toMatchObject({
      position: 1,
      name: 'orbit-hq/console',
      url: 'https://gitranks.test/repo/orbit-hq/console',
    });
    const crumbs = (ofType(jsonLd, 'BreadcrumbList').itemListElement as Node[]).map(({ name }) => name);
    expect(crumbs).toEqual(['Home', 'Repositories', 'nebula/ui', 'Used by']);
  });

  it('names three packages and counts the rest', () => {
    expect(buildUsedBySEO(repo, fivePackages, []).metadata.description).toMatch(
      /^252 repositories with 100\+ stars depend on @nebula\/ui, @nebula\/icons, @nebula\/charts and 2 more\./,
    );
  });

  it('keeps the tab out of search engines without a dependent and while package data cannot be read', () => {
    const none = buildUsedBySEO(repo, noDependents, []);
    expect(none.metadata.robots).toEqual({ index: false });
    expect(none.metadata.title).toBe('Who uses nebula/ui: no repositories with 100+ stars yet');

    const unavailable = buildUsedBySEO(repo, 'unavailable', []);
    expect(unavailable.metadata.robots).toEqual({ index: false });
    expect(unavailable.metadata.description).toBe(PACKAGES_UNAVAILABLE_TEXT);
    expect(unavailable.jsonLd).toEqual([]);
  });
});

describe('buildContributorsSEO', () => {
  it('titles and describes the tab by its 12 months, with the community card', () => {
    const { metadata, jsonLd } = buildContributorsSEO(repo, facts);

    expect(metadata.title).toBe('nebula/ui contributors and code activity');
    expect(metadata.description).toBe(
      '12 active contributors, 96 commits and 30 merged pull requests in the last 12 months. Most active: octo-dev.',
    );
    expect(metadata.alternates?.canonical).toBe('/repo/nebula/ui/contributors');
    expect(metadata.robots).toMatchObject({ index: true });
    expect(JSON.stringify(metadata.openGraph?.images)).toContain(
      '/badge/repo/nebula/ui/community-card.png?size=social',
    );
    // Only contributors with a profile here are listed.
    expect((ofType(jsonLd, 'ItemList').itemListElement as Node[]).map(({ name }) => name)).toEqual(['octo-dev']);
  });

  it('keeps the tab out of search engines without analytics', () => {
    expect(buildContributorsSEO(repo, null).metadata.robots).toEqual({ index: false });
  });
});
