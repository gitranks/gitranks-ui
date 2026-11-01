'use cache';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound, permanentRedirect } from 'next/navigation';

import { RepoScreen } from './components/repo-screen';
import { buildRepoSEO, isRepoRanked } from './seo';
import { readBadgeFacts } from '@/badge/v3/card-facts';
import { loadBadgeRepoCard } from '@/badge/v3/load';
import { PROMOTION } from '@/badge/v3/promotion';
import { fetchRepo } from '@/graphql/helpers/fetch-repo';
import { fetchRepoLanguages } from '@/graphql/helpers/fetch-repo-languages';
import { fetchRepoPulseFacts } from '@/graphql/helpers/fetch-repo-pulse';
import { fetchRepoRankTiers } from '@/graphql/helpers/fetch-repo-rank-tiers';
import { getRepoCacheTag, getRepoPath, parseRepoParams } from '@/utils/repo-paths';

/** From here a repository's promoted set has badges that need no rank. */
const REPO_BIG_PROMOTION_STARS = PROMOTION.repo.at(-1)?.from ?? 1_000;

// Renders as one piece, like the profile pages; cached data keeps the render cheap. One repository is listed in
// generateStaticParams, so any other renders on request as a whole page before the response starts: there is no
// fallback shell, `notFound()` answers 404 and `permanentRedirect()` a real 308. The page is then kept in memory
// only (`lib/cache/page-cache-handler.cjs`), never on disk.
export const instant = false;

export async function generateStaticParams() {
  return [{ owner: 'torvalds', name: 'linux' }];
}

export async function generateMetadata({ params }: PageProps<'/repo/[owner]/[name]'>): Promise<Metadata> {
  const { owner, name } = await params;
  const repoParams = parseRepoParams(owner, name);

  if (!repoParams) {
    notFound();
  }

  const repo = await fetchRepo(repoParams.owner, repoParams.name);

  if (!repo) {
    return {};
  }

  return buildRepoSEO(repo).metadata;
}

export default async function RepoPage({ params }: PageProps<'/repo/[owner]/[name]'>) {
  const { owner: ownerParam, name: nameParam } = await params;
  const repoParams = parseRepoParams(ownerParam, nameParam);

  if (!repoParams) {
    notFound();
  }

  const { owner, name } = repoParams;
  cacheTag(getRepoCacheTag(owner, name));

  const repo = await fetchRepo(owner, name);
  const canonical = !!repo && !repo.renamedTo && repo.nameWithOwner === `${owner}/${name}`;
  const { pulse, complete } = canonical ? await fetchRepoPulseFacts(owner, name) : { pulse: null, complete: true };
  // A running fetch ends on its own and a failed analytics read may work soon: such a page is kept only briefly.
  if (repo?.pull?.status === 'running' || !complete) {
    cacheLife('minutes');
  } else {
    cacheLife('hours');
  }

  if (!repo) {
    notFound();
  }

  // Found by an earlier name: the repository was renamed or transferred.
  if (repo.renamedTo) {
    permanentRedirect(getRepoPath(repo.renamedTo));
  }

  // One URL per repository: a case variant redirects to the stored spelling.
  if (repo.nameWithOwner !== `${owner}/${name}`) {
    permanentRedirect(getRepoPath(repo.nameWithOwner));
  }

  const rank = isRepoRanked(repo) ? repo.rank : null;
  const [[languages, rankTiers], badges] = await Promise.all([
    rank ? Promise.all([fetchRepoLanguages(), fetchRepoRankTiers()]) : ([[], { tiers: null, ok: true }] as const),
    // An unranked repository below the 1k+ set has nothing to promote: no read.
    readBadgeFacts(rank || repo.stars >= REPO_BIG_PROMOTION_STARS ? loadBadgeRepoCard(owner, name) : null),
  ]);
  if (!rankTiers.ok || badges.brief) {
    // A failed read of the tier table or the badge data: try again in minutes rather than keep the page without
    // that part for hours. So too while the repository awaits its first read: its badges' images carry the render's
    // stamp (see `pendingQuery`).
    cacheLife('minutes');
  }

  return (
    <RepoScreen repo={repo} pulse={pulse} languages={languages} tiers={rankTiers.tiers} badgeFacts={badges.facts} />
  );
}
