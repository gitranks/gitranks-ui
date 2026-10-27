import type { Metadata } from 'next';

import { REPO_MIN_RANK_STARS } from '@/app/app.consts';
import { clipText } from '@/lib/seo/clip-text';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { absoluteUrl } from '@/lib/seo/site';
import type { PageRepoQuery } from '@/types/generated/graphql';
import { formatNumberShort } from '@/utils/format-number-short';
import { formatOrdinal } from '@/utils/format-ordinal';
import { getRepoOwnerPath, getRepoPath } from '@/utils/repo-paths';

type Repo = Pick<
  NonNullable<PageRepoQuery['repo']>,
  | 'owner'
  | 'name'
  | 'nameWithOwner'
  | 'ownerAvatarUrl'
  | 'description'
  | 'language'
  | 'stars'
  | 'gainedThisMonth'
  | 'createdAt'
  | 'isArchived'
  | 'isInOrganization'
  | 'rank'
>;

/** A repository's ranks are shown, and its page indexed, from `REPO_MIN_RANK_STARS` and once ranked. */
export function isRepoRanked(repo: Pick<Repo, 'stars' | 'rank'>): boolean {
  return repo.stars >= REPO_MIN_RANK_STARS && !!repo.rank?.s;
}

/** The language a rank is in: its name, or the ranking of repositories without one. */
const languageRankName = (language?: string | null) => (language ? `${language} rank` : 'Rank without a language');

function buildDescription(repo: Repo, ranked: boolean): string {
  const { rank, language, stars, gainedThisMonth, description } = repo;
  const parts = [
    ranked ? `Global rank: ${formatOrdinal(rank?.s)}.` : undefined,
    ranked && rank?.l ? `${languageRankName(rank.language)}: ${formatOrdinal(rank.l)}.` : undefined,
    `${formatNumberShort(stars)} stars${gainedThisMonth && gainedThisMonth > 0 ? `, +${formatNumberShort(gainedThisMonth)} this month` : ''}.`,
    // A language rank in the repository's language names it already.
    language && !(ranked && rank?.l && rank.language === language) ? `${language}.` : undefined,
    description,
  ];

  return clipText(parts.filter(Boolean).join(' '), 158);
}

/** The owner as a schema.org node; `undefined` when the API does not say whether it is a user or an organization. */
function buildOwner(repo: Repo) {
  const path = getRepoOwnerPath(repo.owner, repo.isInOrganization);

  if (!path) {
    return undefined;
  }

  return {
    '@type': repo.isInOrganization ? 'Organization' : 'Person',
    name: repo.owner,
    url: absoluteUrl(path),
    image: repo.ownerAvatarUrl || undefined,
    sameAs: [`https://github.com/${repo.owner}`],
  };
}

function buildSourceCode(repo: Repo, url: string) {
  const owner = buildOwner(repo);
  const createdAt = repo.createdAt ? new Date(repo.createdAt) : undefined;

  return {
    '@type': 'SoftwareSourceCode',
    name: repo.name,
    alternateName: repo.nameWithOwner,
    description: repo.description || undefined,
    url,
    codeRepository: `https://github.com/${repo.nameWithOwner}`,
    sameAs: [`https://github.com/${repo.nameWithOwner}`],
    programmingLanguage: repo.language || undefined,
    dateCreated: createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toISOString() : undefined,
    creativeWorkStatus: repo.isArchived ? 'Archived' : undefined,
    // The owner keeps the repository, but may not have written it (a transfer, an organization).
    maintainer: owner,
    // GitHub stars, counted like likes.
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/LikeAction',
      userInteractionCount: repo.stars,
    },
  };
}

/** Home, then the owner's page when it is known, then the repository. */
function buildBreadcrumbs(repo: Repo, url: string) {
  const owner = buildOwner(repo);
  const crumbs = owner
    ? [
        { name: repo.owner, item: owner.url },
        { name: repo.name, item: url },
      ]
    : [{ name: repo.nameWithOwner, item: url }];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', item: absoluteUrl('/') }, ...crumbs].map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      ...crumb,
    })),
  };
}

/** Metadata for a repository page and the JSON-LD to render on it. */
export function buildRepoSEO(repo: Repo): { metadata: Metadata; jsonLd: object[] } {
  const ranked = isRepoRanked(repo);
  const path = getRepoPath(repo.nameWithOwner);
  const url = absoluteUrl(path);
  const title = `${repo.nameWithOwner} - GitHub Repository Rank`;
  const description = buildDescription(repo, ranked);
  const image = repo.ownerAvatarUrl || undefined;

  const metadata = pageMetadata({ title, description, path, images: image ? [image] : undefined });
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'ItemPage',
      url,
      name: title,
      description,
      mainEntity: buildSourceCode(repo, url),
    },
    buildBreadcrumbs(repo, url),
  ];

  return {
    metadata: {
      ...metadata,
      // Only ranked repositories are indexed; the rest are thin pages until they join the rankings.
      robots: ranked
        ? { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 }
        : { index: false },
    },
    jsonLd,
  };
}
