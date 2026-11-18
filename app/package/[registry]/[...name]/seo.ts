import type { Metadata } from 'next';

import { formatCount } from '@/app/repo/[owner]/[name]/utils/used-by-summary';
import { SOCIAL_CARD_SIZE, socialCardPath } from '@/badge/v3/links';
import type { PackageDependent, PackagePage } from '@/graphql/package-page';
import { clipText } from '@/lib/seo/clip-text';
import { buildRankingItemList } from '@/lib/seo/json-ld';
import { type PreviewImage, pageMetadata } from '@/lib/seo/page-metadata';
import { absoluteUrl } from '@/lib/seo/site';
import { packagePath, packageRankingPath } from '@/utils/package-paths';
import { getRepoPath } from '@/utils/repo-paths';

/** What the page says while the API cannot read package data. */
export const PACKAGE_UNAVAILABLE_TEXT = 'Package data is not available right now. Try again in a few minutes.';

const INDEXED: Metadata['robots'] = {
  index: true,
  follow: true,
  'max-image-preview': 'large',
  'max-snippet': -1,
  'max-video-preview': -1,
};
const NOT_INDEXED: Metadata['robots'] = { index: false };

const plural = (count: number, one: string, many: string) => `${formatCount(count)} ${count === 1 ? one : many}`;

export const packageTitle = (name: string) => `${name} - npm package dependents, downloads and ranks`;

/** "#12 by downloads, #40 by dependents' stars": the ranks it has, in the rankings' order. */
function ranksText(ranks: PackagePage['ranks']): string | undefined {
  const parts = [
    ranks?.downloads && `#${formatCount(ranks.downloads.rank)} by downloads`,
    ranks?.dependentsStars && `#${formatCount(ranks.dependentsStars.rank)} by dependents' stars`,
    ranks?.dependents && `#${formatCount(ranks.dependents.rank)} by dependents`,
  ].filter(Boolean);
  return parts.length ? `npm rank ${parts.join(', ')}.` : undefined;
}

function buildDescription(pkg: PackagePage): string {
  const { dependentsCount: count, dependentsStars: stars, downloads } = pkg;
  return clipText(
    [
      count > 0
        ? `Used by ${plural(count, 'repository', 'repositories')} with 100+ stars (${plural(stars, 'star', 'stars')} between them).`
        : 'No repository with 100+ stars uses it directly yet.',
      downloads ? `${formatCount(downloads.lastWeek)} downloads last week.` : undefined,
      ranksText(pkg.ranks),
      pkg.description || undefined,
    ]
      .filter(Boolean)
      .join(' '),
    158,
  );
}

/** Home, the package rankings, then the package. */
function buildBreadcrumbs(name: string, url: string) {
  const crumbs = [
    { name: 'Home', item: absoluteUrl('/') },
    { name: 'Package rankings', item: absoluteUrl(packageRankingPath('downloads')) },
    { name, item: url },
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({ '@type': 'ListItem', position: i + 1, ...crumb })),
  };
}

/** The package as a schema.org `SoftwareApplication`. */
function buildApplication(pkg: PackagePage, url: string) {
  const source = pkg.repo?.nameWithOwner ?? pkg.repositoryName;
  return {
    '@type': 'SoftwareApplication',
    name: pkg.name,
    description: pkg.description || undefined,
    url,
    applicationCategory: 'DeveloperApplication',
    softwareVersion: pkg.latestVersion || undefined,
    license: pkg.license || undefined,
    codeRepository: source ? `https://github.com/${source}` : undefined,
    sameAs: [`https://www.npmjs.com/package/${pkg.name}`],
    interactionStatistic: pkg.downloads
      ? {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/DownloadAction',
          userInteractionCount: pkg.downloads.lastWeek,
        }
      : undefined,
  };
}

/** The link preview: the package's card drawn at 1200×630, which every read package has. */
function previewImages(name: string): PreviewImage[] {
  return [
    {
      url: absoluteUrl(socialCardPath({ kind: 'package', registry: 'npm', name })),
      ...SOCIAL_CARD_SIZE,
      alt: `${packageTitle(name)} on GitRanks`,
    },
  ];
}

type SEO = { metadata: Metadata; jsonLd: object[] };

/** A page kept out of search engines, with no structured data: not read yet, or no package data now. */
function quietSEO(name: string, description: string): SEO {
  return {
    metadata: {
      ...pageMetadata({ title: packageTitle(name), description, path: packagePath(name) }),
      robots: NOT_INDEXED,
    },
    jsonLd: [],
  };
}

/**
 * Metadata and JSON-LD of a package's page. Indexed only with a dependent: a package no repository with 100+ stars
 * uses, one not read yet, and the page while package data cannot be read are kept out of search engines.
 */
export function buildPackageSEO(
  pkg: PackagePage | 'unavailable',
  name: string,
  rows: readonly Pick<PackageDependent, 'nameWithOwner'>[] = [],
): SEO {
  if (pkg === 'unavailable') {
    return quietSEO(name, PACKAGE_UNAVAILABLE_TEXT);
  }
  if (pkg.state === 'NOT_READ') {
    return quietSEO(pkg.name, `We have not read the npm package ${pkg.name} yet.`);
  }

  const path = packagePath(pkg.name);
  const url = absoluteUrl(path);
  const title = packageTitle(pkg.name);
  const description = buildDescription(pkg);
  const itemList = buildRankingItemList(
    `Repositories with 100+ stars that use ${pkg.name}`,
    path,
    rows.map((row, i) => ({ position: i + 1, name: row.nameWithOwner, path: getRepoPath(row.nameWithOwner) })),
  );

  return {
    metadata: {
      ...pageMetadata({ title, description, path, images: previewImages(pkg.name) }),
      robots: pkg.dependentsCount > 0 && rows.length > 0 ? INDEXED : NOT_INDEXED,
    },
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'ItemPage',
        url,
        name: title,
        description,
        mainEntity: buildApplication(pkg, url),
      },
      ...(itemList ? [itemList] : []),
      buildBreadcrumbs(pkg.name, url),
    ],
  };
}
