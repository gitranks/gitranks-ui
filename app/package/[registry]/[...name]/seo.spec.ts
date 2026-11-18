import { describe, expect, it, vi } from 'vitest';

import { dependentRows, notReadPackage, quietPackage, rankedPackage } from './__fixtures__/package';
import { buildPackageSEO, PACKAGE_UNAVAILABLE_TEXT } from './seo';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.com';
});

type Node = { '@type': string; [key: string]: unknown };

describe('buildPackageSEO', () => {
  it('titles, describes and indexes a package with dependents, with its JSON-LD', () => {
    const { metadata, jsonLd } = buildPackageSEO(rankedPackage, rankedPackage.name, dependentRows);

    expect(metadata.title).toBe('react-resize-detector - npm package dependents, downloads and ranks');
    expect(metadata.description).toBe(
      "Used by 16 repositories with 100+ stars (16,429 stars between them). 1,797,999 downloads last week. npm rank #1,234 by downloads, #40 by dependents' stars,…",
    );
    expect((metadata.description ?? '').length).toBeLessThanOrEqual(158);
    expect(metadata.alternates?.canonical).toBe('/package/npm/react-resize-detector');
    expect(metadata.robots).toMatchObject({ index: true });
    expect((jsonLd as Node[]).map((node) => node['@type'])).toEqual(['ItemPage', 'ItemList', 'BreadcrumbList']);

    const app = (jsonLd[0] as { mainEntity: Node }).mainEntity;
    expect(app).toMatchObject({
      '@type': 'SoftwareApplication',
      name: 'react-resize-detector',
      applicationCategory: 'DeveloperApplication',
      softwareVersion: '12.3.0',
      license: 'MIT',
      codeRepository: 'https://github.com/acme/react-resize-detector',
      interactionStatistic: { '@type': 'InteractionCounter', userInteractionCount: 1_797_999 },
    });
    expect(metadata.openGraph?.images).toEqual([
      {
        url: 'https://gitranks.com/badge/package/npm/react-resize-detector/package-card.png?size=social',
        width: 1200,
        height: 630,
        alt: 'react-resize-detector on GitRanks: npm package dependents, downloads and ranks',
      },
    ]);
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
    const crumbs = (jsonLd[2] as { itemListElement: { name: string }[] }).itemListElement.map(({ name }) => name);
    expect(crumbs).toEqual(['Home', 'Package rankings', 'react-resize-detector']);
  });

  it('keeps a package no repository with 100+ stars uses out of search engines, its scope in the canonical', () => {
    const { metadata } = buildPackageSEO(quietPackage, quietPackage.name, []);

    expect(metadata.robots).toEqual({ index: false });
    expect(metadata.alternates?.canonical).toBe('/package/npm/@nebula/ui');
    expect(metadata.description).toContain('No repository with 100+ stars uses it directly yet.');
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: 'https://gitranks.com/badge/package/npm/@nebula/ui/package-card.png?size=social',
      }),
    ]);
  });

  it('keeps a package not read yet and the unavailable page out, with no JSON-LD', () => {
    const notRead = buildPackageSEO(notReadPackage, notReadPackage.name);
    expect(notRead.metadata.robots).toEqual({ index: false });
    expect(notRead.jsonLd).toEqual([]);
    expect(notRead.metadata.openGraph?.images).toBeUndefined();

    const unavailable = buildPackageSEO('unavailable', 'react');
    expect(unavailable.metadata.robots).toEqual({ index: false });
    expect(unavailable.metadata.description).toBe(PACKAGE_UNAVAILABLE_TEXT);
    expect(unavailable.jsonLd).toEqual([]);
  });
});
