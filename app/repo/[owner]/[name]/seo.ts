import type { Metadata } from 'next';

import { REPO_MIN_RANK_STARS } from '@/app/app.consts';
import { clipText } from '@/lib/seo/clip-text';
import { pageMetadata } from '@/lib/seo/page-metadata';
import type { PageRepoQuery } from '@/types/generated/graphql';
import { formatNumberShort } from '@/utils/format-number-short';
import { formatOrdinal } from '@/utils/format-ordinal';
import { getRepoPath } from '@/utils/repo-paths';

type Repo = Pick<NonNullable<PageRepoQuery['repo']>, 'nameWithOwner' | 'description' | 'stars' | 'rank'>;

/** A repository's ranks are shown, and its page indexed, from `REPO_MIN_RANK_STARS` and once ranked. */
export function isRepoRanked(repo: Pick<Repo, 'stars' | 'rank'>): boolean {
  return repo.stars >= REPO_MIN_RANK_STARS && !!repo.rank?.s;
}

export function buildRepoMetadata(repo: Repo): Metadata {
  const ranked = isRepoRanked(repo);
  const parts = [
    ranked ? `Global rank: ${formatOrdinal(repo.rank?.s)}.` : undefined,
    `${formatNumberShort(repo.stars)} stars.`,
    repo.description,
  ];

  const metadata = pageMetadata({
    title: `${repo.nameWithOwner} - GitHub Repository Rank`,
    description: clipText(parts.filter(Boolean).join(' '), 158),
    path: getRepoPath(repo.nameWithOwner),
  });

  return ranked ? metadata : { ...metadata, robots: { index: false } };
}
