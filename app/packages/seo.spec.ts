import { describe, expect, it } from 'vitest';

import { downloadsRanking } from './__fixtures__/package-rankings';
import {
  buildPackageRankingJsonLd,
  buildPackageRankingMetadata,
  buildPackageRankingQuestions,
  PACKAGE_RANKINGS_IMAGE,
} from './seo';

const PAGE = { registry: 'npm', registryLabel: 'npm', order: 'downloads', page: 1 } as const;

describe('buildPackageRankingMetadata', () => {
  it('titles the ranking, says what it counts, its top three and how many are ranked', () => {
    const metadata = buildPackageRankingMetadata({ ...PAGE, rows: downloadsRanking, ranked: 41_870 });

    expect(metadata.title).toBe('npm Package Ranking by Downloads');
    expect(metadata.description).toBe(
      'npm packages ranked by weekly downloads. The top 3: moss-date, @orbit/fetch and kite-router. 41,870 packages ranked.',
    );
    expect(metadata.alternates?.canonical).toBe('/packages/npm/downloads/1');
    expect(metadata.robots).toBeUndefined();
  });

  it('gives a later page its own title, description and canonical', () => {
    const metadata = buildPackageRankingMetadata({ ...PAGE, order: 'dependents-stars', page: 3, rows: [] });

    expect(metadata.title).toBe("npm Package Ranking by Dependents' stars · Page 3");
    expect(metadata.description).toBe(
      'npm packages ranked by the stars of the repositories with 100+ stars that use them, page 3.',
    );
    expect(metadata.alternates?.canonical).toBe('/packages/npm/dependents-stars/3');
  });

  it('keeps the description to 158 characters', () => {
    const rows = downloadsRanking.map((row) => ({ ...row, name: `${row.name}-${'x'.repeat(40)}` }));
    expect((buildPackageRankingMetadata({ ...PAGE, rows, ranked: 1 }).description ?? '').length).toBeLessThanOrEqual(
      158,
    );
  });

  it('shows the one image of the package rankings in link previews', () => {
    const metadata = buildPackageRankingMetadata({ ...PAGE, order: 'dependents' });
    const [image] = (metadata.openGraph?.images ?? []) as { url: string; width: number; height: number }[];

    expect(image.url.endsWith(PACKAGE_RANKINGS_IMAGE)).toBe(true);
    expect([image.width, image.height]).toEqual([1200, 630]);
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
  });
});

describe('buildPackageRankingJsonLd', () => {
  const types = (payloads: object[]) => payloads.map((payload) => (payload as { '@type': string })['@type']);

  it('lists the packages and the breadcrumbs', () => {
    const [list, crumbs] = buildPackageRankingJsonLd({ ...PAGE, rows: downloadsRanking }) as [
      { name: string; numberOfItems: number },
      { itemListElement: { name: string; item: string }[] },
    ];

    expect(types([list, crumbs])).toEqual(['ItemList', 'BreadcrumbList']);
    expect(list.name).toBe('npm Package Ranking by Downloads');
    expect(list.numberOfItems).toBe(12);
    expect(crumbs.itemListElement.map(({ name }) => name)).toEqual(['Home', 'npm Package Ranking by Downloads']);
  });

  it('adds the page past the first to the breadcrumbs, and no list for an empty page', () => {
    const payloads = buildPackageRankingJsonLd({ ...PAGE, page: 2, rows: [] });
    const [crumbs] = payloads as [{ itemListElement: { name: string; item: string }[] }];

    expect(types(payloads)).toEqual(['BreadcrumbList']);
    expect(crumbs.itemListElement.at(-1)?.name).toBe('Page 2');
    expect(crumbs.itemListElement.at(-1)?.item.endsWith('/packages/npm/downloads/2')).toBe(true);
  });
});

describe('buildPackageRankingQuestions', () => {
  it('answers from the page: what it counts, who leads, what a dependent is, and when the numbers are from', () => {
    const items = buildPackageRankingQuestions({
      ...PAGE,
      rows: downloadsRanking,
      readOn: 'November 16, 2026',
      ranksOn: 'November 17, 2026',
    });

    expect(items.map(({ question }) => question)).toEqual([
      'What does the npm package ranking by downloads count?',
      'Which npm package is first by weekly downloads?',
      'What counts as a dependent?',
      'How often are package rankings updated?',
    ]);
    expect(items[1].answer).toBe('moss-date, with 5,806,310 downloads last week. Then @orbit/fetch and kite-router.');
    expect(items[3].answer).toBe(
      'Dependents are read once a month, last on November 16, 2026. Ranks are worked out again after each monthly read and at least once a week; these are of November 17, 2026.',
    );
  });

  it('leaves out the leader without rows, and the dates it does not have', () => {
    const items = buildPackageRankingQuestions({ ...PAGE, order: 'dependents', rows: [] });

    expect(items.map(({ question }) => question)).not.toContain('Which npm package is first by dependents?');
    expect(items.at(-1)?.answer).toBe(
      'Dependents are read once a month. Ranks are worked out again after each monthly read and at least once a week.',
    );
  });
});
