import type { Metadata } from 'next';

import { repoImagesOf } from './seo';
import { topContributorOf } from './utils/contributors-summary';
import { repoTabPath } from './utils/repo-tabs';
import { formatCount } from './utils/used-by-summary';
import { badgeImagePath } from '@/badge/v3/links';
import type { PulseFactsData } from '@/components/pulse/pulse.utils';
import type { Unavailable } from '@/graphql/helpers/fetch-repo-packages';
import type { RepoPackages, RepoUsedByItem } from '@/graphql/repo-packages';
import { clipText } from '@/lib/seo/clip-text';
import { buildRankingItemList, type EntityImages } from '@/lib/seo/json-ld';
import { entityPreviewImages, pageMetadata } from '@/lib/seo/page-metadata';
import { absoluteUrl } from '@/lib/seo/site';
import { getRepoPath, getRepoRankingPath } from '@/utils/repo-paths';

type Repo = Parameters<typeof repoImagesOf>[0];

/** What every tab says while the API cannot read package data. */
export const PACKAGES_UNAVAILABLE_TEXT = 'Package data is not available right now. Try again in a few minutes.';

const INDEXED: Metadata['robots'] = {
  index: true,
  follow: true,
  'max-image-preview': 'large',
  'max-snippet': -1,
  'max-video-preview': -1,
};
const NOT_INDEXED: Metadata['robots'] = { index: false };

const plural = (count: number, one: string, many: string) => `${formatCount(count)} ${count === 1 ? one : many}`;

/** Home, the repository rankings, the repository, then the tab. */
function tabBreadcrumbs(nameWithOwner: string, tab: { name: string; path: string }) {
  const crumbs = [
    { name: 'Home', item: absoluteUrl('/') },
    { name: 'Repositories', item: absoluteUrl(getRepoRankingPath(1)) },
    { name: nameWithOwner, item: absoluteUrl(getRepoPath(nameWithOwner)) },
    { name: tab.name, item: absoluteUrl(tab.path) },
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({ '@type': 'ListItem', position: i + 1, ...crumb })),
  };
}

/** The packages in a description: up to three names, then how many more. */
function packageNames(packages: RepoPackages): string {
  const names = packages.items.slice(0, 3).map(({ name }) => name);
  const more = packages.total - names.length;
  if (more > 0) return `${names.join(', ')} and ${formatCount(more)} more`;
  return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/**
 * Metadata and JSON-LD of a repository's Used by tab. Kept out of search engines without a dependent and while
 * package data cannot be read.
 */
export function buildUsedBySEO(
  repo: Repo,
  packages: RepoPackages | Unavailable,
  rows: readonly Pick<RepoUsedByItem, 'nameWithOwner' | 'stars'>[],
): { metadata: Metadata; jsonLd: object[] } {
  const path = repoTabPath(repo.nameWithOwner, 'used-by');
  // Its own social card until a package's card is drawn: the repository's.
  const images = entityPreviewImages(repoImagesOf(repo, absoluteUrl(getRepoPath(repo.nameWithOwner))));

  if (packages === 'unavailable') {
    return {
      metadata: {
        ...pageMetadata({
          title: `Who uses ${repo.nameWithOwner}`,
          description: PACKAGES_UNAVAILABLE_TEXT,
          path,
          images,
        }),
        robots: NOT_INDEXED,
      },
      jsonLd: [],
    };
  }

  const { dependents } = packages;
  const title = dependents
    ? `Who uses ${repo.nameWithOwner}: ${plural(dependents, 'repository', 'repositories')} with 100+ stars`
    : `Who uses ${repo.nameWithOwner}: no repositories with 100+ stars yet`;
  const [first] = rows;
  const description = clipText(
    [
      dependents
        ? `${plural(dependents, 'repository', 'repositories')} with 100+ stars ${dependents === 1 ? 'depends' : 'depend'} on ${packageNames(packages)}.`
        : `No repository with 100+ stars depends on ${packageNames(packages)} yet.`,
      first ? `The most-starred is ${first.nameWithOwner} (${plural(first.stars, 'star', 'stars')}).` : undefined,
      `${formatCount(packages.downloadsLastWeek)} downloads a week on npm.`,
    ]
      .filter(Boolean)
      .join(' '),
    158,
  );

  const itemList = buildRankingItemList(
    `Repositories with 100+ stars that use ${repo.nameWithOwner}'s packages`,
    path,
    rows.map((row, i) => ({ position: i + 1, name: row.nameWithOwner, path: getRepoPath(row.nameWithOwner) })),
  );

  return {
    metadata: { ...pageMetadata({ title, description, path, images }), robots: dependents ? INDEXED : NOT_INDEXED },
    jsonLd: [...(itemList ? [itemList] : []), tabBreadcrumbs(repo.nameWithOwner, { name: 'Used by', path })],
  };
}

type Pulse = Pick<PulseFactsData, 'last12' | 'topContributors'>;

/**
 * Metadata and JSON-LD of a repository's Contributors tab: its numbers of 12 months and its top contributors. Kept out
 * of search engines without analytics.
 */
export function buildContributorsSEO(repo: Repo, pulse: Pulse | null): { metadata: Metadata; jsonLd: object[] } {
  const path = repoTabPath(repo.nameWithOwner, 'contributors');
  const title = `${repo.nameWithOwner} contributors and code activity`;
  const url = absoluteUrl(getRepoPath(repo.nameWithOwner));
  const repoImages = repoImagesOf(repo, url);
  const images: EntityImages = pulse
    ? {
        ...repoImages,
        card: {
          url: absoluteUrl(
            badgeImagePath({ kind: 'repo', nameWithOwner: repo.nameWithOwner }, 'community-card', 'png', {
              size: 'social',
            }),
          ),
          caption: `${repo.nameWithOwner} on GitRanks: contributors and code activity`,
        },
      }
    : repoImages;

  if (!pulse) {
    return {
      metadata: {
        ...pageMetadata({
          title,
          description: `Contributors and code activity of ${repo.nameWithOwner} on GitRanks.`,
          path,
          images: entityPreviewImages(images),
        }),
        robots: NOT_INDEXED,
      },
      jsonLd: [tabBreadcrumbs(repo.nameWithOwner, { name: 'Contributors', path })],
    };
  }

  const { last12 } = pulse;
  const top = topContributorOf(pulse);
  const description = clipText(
    [
      `${plural(last12.activeContributors, 'active contributor', 'active contributors')}, ${plural(last12.commits, 'commit', 'commits')} and ${plural(last12.pullRequests, 'merged pull request', 'merged pull requests')} in the last 12 months.`,
      top ? `Most active: ${top.login}.` : undefined,
    ]
      .filter(Boolean)
      .join(' '),
    158,
  );
  const itemList = buildRankingItemList(
    `Top contributors to ${repo.nameWithOwner}`,
    path,
    pulse.topContributors.flatMap((person, i) =>
      person.login && person.hasProfile
        ? [{ position: i + 1, name: person.login, path: `/profile/${encodeURIComponent(person.login)}` }]
        : [],
    ),
  );

  return {
    metadata: {
      ...pageMetadata({ title, description, path, images: entityPreviewImages(images) }),
      robots: INDEXED,
    },
    jsonLd: [...(itemList ? [itemList] : []), tabBreadcrumbs(repo.nameWithOwner, { name: 'Contributors', path })],
  };
}
