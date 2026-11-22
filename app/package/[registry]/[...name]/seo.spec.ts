import { describe, expect, it, vi } from 'vitest';

import { dependentRows, notReadPackage, quietPackage, rankedPackage } from './__fixtures__/package';
import { buildPackageSEO, PACKAGE_UNAVAILABLE_TEXT, packageTitle } from './seo';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.com';
});

type Node = { '@type': string; [key: string]: unknown };

describe('buildPackageSEO', () => {
  it("pins an npm package page's metadata and JSON-LD, read or not", () => {
    expect(buildPackageSEO(rankedPackage, rankedPackage.name, dependentRows)).toMatchInlineSnapshot(`
      {
        "jsonLd": [
          {
            "@context": "https://schema.org",
            "@type": "ItemPage",
            "description": "Used by 16 repositories with 100+ stars (16,429 stars between them). 1,797,999 downloads last week. npm rank #1,234 by downloads, #40 by dependents' stars,…",
            "mainEntity": {
              "@type": "SoftwareApplication",
              "applicationCategory": "DeveloperApplication",
              "codeRepository": "https://github.com/acme/react-resize-detector",
              "description": "A Cross-Browser, Event-based, Element Resize Detection for React",
              "interactionStatistic": {
                "@type": "InteractionCounter",
                "interactionType": "https://schema.org/DownloadAction",
                "userInteractionCount": 1797999,
              },
              "license": "MIT",
              "name": "react-resize-detector",
              "sameAs": [
                "https://www.npmjs.com/package/react-resize-detector",
              ],
              "softwareVersion": "12.3.0",
              "url": "https://gitranks.com/package/npm/react-resize-detector",
            },
            "name": "react-resize-detector - npm package dependents, downloads and ranks",
            "url": "https://gitranks.com/package/npm/react-resize-detector",
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "name": "kiali/kiali",
                "position": 1,
                "url": "https://gitranks.com/repo/kiali/kiali",
              },
              {
                "@type": "ListItem",
                "name": "notea-org/notea",
                "position": 2,
                "url": "https://gitranks.com/repo/notea-org/notea",
              },
            ],
            "itemListOrder": "https://schema.org/ItemListOrderAscending",
            "name": "Repositories with 100+ stars that use react-resize-detector",
            "numberOfItems": 2,
            "url": "https://gitranks.com/package/npm/react-resize-detector",
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "item": "https://gitranks.com/",
                "name": "Home",
                "position": 1,
              },
              {
                "@type": "ListItem",
                "item": "https://gitranks.com/packages/npm/downloads/1",
                "name": "Package rankings",
                "position": 2,
              },
              {
                "@type": "ListItem",
                "item": "https://gitranks.com/package/npm/react-resize-detector",
                "name": "react-resize-detector",
                "position": 3,
              },
            ],
          },
        ],
        "metadata": {
          "alternates": {
            "canonical": "/package/npm/react-resize-detector",
            "types": {
              "text/markdown": "/package/npm/react-resize-detector/facts.md",
            },
          },
          "description": "Used by 16 repositories with 100+ stars (16,429 stars between them). 1,797,999 downloads last week. npm rank #1,234 by downloads, #40 by dependents' stars,…",
          "openGraph": {
            "description": "Used by 16 repositories with 100+ stars (16,429 stars between them). 1,797,999 downloads last week. npm rank #1,234 by downloads, #40 by dependents' stars,…",
            "images": [
              {
                "alt": "react-resize-detector - npm package dependents, downloads and ranks on GitRanks",
                "height": 630,
                "url": "https://gitranks.com/badge/package/npm/react-resize-detector/package-card.png?size=social",
                "width": 1200,
              },
            ],
            "locale": "en_US",
            "siteName": "GitRanks",
            "title": "react-resize-detector - npm package dependents, downloads and ranks",
            "type": "website",
            "url": "/package/npm/react-resize-detector",
          },
          "robots": {
            "follow": true,
            "index": true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
          "title": "react-resize-detector - npm package dependents, downloads and ranks",
          "twitter": {
            "card": "summary_large_image",
            "description": "Used by 16 repositories with 100+ stars (16,429 stars between them). 1,797,999 downloads last week. npm rank #1,234 by downloads, #40 by dependents' stars,…",
            "images": [
              {
                "alt": "react-resize-detector - npm package dependents, downloads and ranks on GitRanks",
                "height": 630,
                "url": "https://gitranks.com/badge/package/npm/react-resize-detector/package-card.png?size=social",
                "width": 1200,
              },
            ],
            "site": "@gitranks",
            "title": "react-resize-detector - npm package dependents, downloads and ranks",
          },
        },
      }
    `);
    expect(buildPackageSEO(notReadPackage, notReadPackage.name)).toMatchInlineSnapshot(`
      {
        "jsonLd": [],
        "metadata": {
          "alternates": {
            "canonical": "/package/npm/left-pad-next",
          },
          "description": "We have not read the npm package left-pad-next yet.",
          "openGraph": {
            "description": "We have not read the npm package left-pad-next yet.",
            "images": undefined,
            "locale": "en_US",
            "siteName": "GitRanks",
            "title": "left-pad-next - npm package dependents, downloads and ranks",
            "type": "website",
            "url": "/package/npm/left-pad-next",
          },
          "robots": {
            "index": false,
          },
          "title": "left-pad-next - npm package dependents, downloads and ranks",
          "twitter": {
            "card": "summary",
            "description": "We have not read the npm package left-pad-next yet.",
            "images": undefined,
            "site": "@gitranks",
            "title": "left-pad-next - npm package dependents, downloads and ranks",
          },
        },
      }
    `);
  });

  it('titles, describes and indexes a package with dependents, with its JSON-LD', () => {
    const { metadata, jsonLd } = buildPackageSEO(rankedPackage, rankedPackage.name, dependentRows);

    expect(metadata.title).toBe('react-resize-detector - npm package dependents, downloads and ranks');
    expect(metadata.description).toBe(
      "Used by 16 repositories with 100+ stars (16,429 stars between them). 1,797,999 downloads last week. npm rank #1,234 by downloads, #40 by dependents' stars,…",
    );
    expect((metadata.description ?? '').length).toBeLessThanOrEqual(158);
    expect(metadata.alternates?.canonical).toBe('/package/npm/react-resize-detector');
    expect(metadata.alternates?.types).toEqual({ 'text/markdown': '/package/npm/react-resize-detector/facts.md' });
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
        alt: 'react-resize-detector - npm package dependents, downloads and ranks on GitRanks',
      },
    ]);
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
    const crumbs = (jsonLd[2] as { itemListElement: { name: string }[] }).itemListElement.map(({ name }) => name);
    expect(crumbs).toEqual(['Home', 'Package rankings', 'react-resize-detector']);
  });

  it('leaves downloads out of the title on a registry that publishes no download counts', () => {
    expect(packageTitle('github.com/stretchr/testify', 'go')).toBe(
      'github.com/stretchr/testify - Go package dependents and ranks',
    );
    expect(packageTitle('serde', 'crates')).toBe('serde - crates.io package dependents, downloads and ranks');
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
    expect(notRead.metadata.alternates?.types).toBeUndefined();

    const unavailable = buildPackageSEO('unavailable', 'react');
    expect(unavailable.metadata.robots).toEqual({ index: false });
    expect(unavailable.metadata.description).toBe(PACKAGE_UNAVAILABLE_TEXT);
    expect(unavailable.jsonLd).toEqual([]);
  });
});
