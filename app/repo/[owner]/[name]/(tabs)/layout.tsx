import { cacheLife, cacheTag } from 'next/cache';

import { RepoFrame } from '../components/repo-frame';
import { isRepoRanked } from '../seo';
import { readBadgeFacts } from '@/badge/v3/card-facts';
import { loadBadgeRepoCard } from '@/badge/v3/load';
import { PROMOTION } from '@/badge/v3/promotion';
import { fetchRepo } from '@/graphql/helpers/fetch-repo';
import { fetchRepoPackages, UNAVAILABLE } from '@/graphql/helpers/fetch-repo-packages';
import { fetchRepoPulseFacts } from '@/graphql/helpers/fetch-repo-pulse';
import { getRepoCacheTag, parseRepoParams } from '@/utils/repo-paths';

/** From here a repository's promoted set has badges that need no rank. */
const REPO_BIG_PROMOTION_STARS = PROMOTION.repo.at(-1)?.from ?? 1_000;

// The repository's tabs: Overview (the proxy sends `/repo/<owner>/<name>` there), Used by
// and Contributors. Rendered as one piece, like the profile's: one repository is listed in generateStaticParams and no
// Suspense boundary or loading.tsx sits above the pages, so any other renders on request as a whole page before the
// response starts, and a page's `notFound()` answers 404 and `permanentRedirect()` a real 308.
export const instant = false;

export async function generateStaticParams() {
  return [{ owner: 'torvalds', name: 'linux' }];
}

export default async function RepoTabsLayout({ children, params }: LayoutProps<'/repo/[owner]/[name]'>) {
  'use cache';
  const { owner: ownerParam, name: nameParam } = await params;
  const repoParams = parseRepoParams(ownerParam, nameParam);
  // The page answers 404 or redirects; the frame is drawn only around a tab of a repository found by its own name.
  if (!repoParams) {
    return children;
  }

  const { owner, name } = repoParams;
  cacheTag(getRepoCacheTag(owner, name));
  const repo = await fetchRepo(owner, name);
  if (!repo || repo.renamedTo || repo.nameWithOwner !== `${owner}/${name}`) {
    cacheLife('minutes');
    return children;
  }

  const rank = isRepoRanked(repo) ? repo.rank : null;
  const [packages, { pulse, complete }, badges] = await Promise.all([
    fetchRepoPackages(owner, name),
    fetchRepoPulseFacts(owner, name),
    // An unranked repository below the 1k+ set has nothing to promote: no read.
    readBadgeFacts(rank || repo.stars >= REPO_BIG_PROMOTION_STARS ? loadBadgeRepoCard(owner, name) : null),
  ]);
  // A running fetch, a failed read or package data that could not be read: kept for minutes, not hours.
  if (repo.pull?.status === 'running' || !complete || badges.brief || packages === UNAVAILABLE) {
    cacheLife('minutes');
  } else {
    cacheLife('hours');
  }

  return (
    <RepoFrame
      repo={repo}
      packages={packages}
      contributors={pulse ? pulse.last12.activeContributors : null}
      badgeFacts={badges.facts}
      now={new Date()}
    >
      {children}
    </RepoFrame>
  );
}
