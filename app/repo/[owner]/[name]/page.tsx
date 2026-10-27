'use cache';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound, permanentRedirect } from 'next/navigation';

import { RepoLayout } from './components/repo-layout';
import { RepoPulseArea } from './components/repo-pulse-area';
import { RepoRankCard } from './components/repo-rank-card';
import { StarHistoryBadgeSection } from './components/star-history-badge-section';
import { StarHistorySection } from './components/star-history-section';
import { buildRepoMetadata, isRepoRanked } from './seo';
import { REPO_MIN_RANK_STARS } from '@/app/app.consts';
import { ProfileCard, ProfileCardsGrid } from '@/app/profile/[login]/components/profile-card';
import { Header } from '@/components/header/header';
import { fetchRepo } from '@/graphql/helpers/fetch-repo';
import { fetchRepoLanguages } from '@/graphql/helpers/fetch-repo-languages';
import { fetchRepoPulseFacts } from '@/graphql/helpers/fetch-repo-pulse';
import {
  getRankingPageOf,
  getRepoCacheTag,
  getRepoLanguageRankingPath,
  getRepoPath,
  getRepoRankingPath,
  parseRepoParams,
} from '@/utils/repo-paths';

// Renders on request as one piece, like the profile pages; cached data keeps the render cheap.
export const instant = false;

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

  return buildRepoMetadata(repo);
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
  const languages = rank ? await fetchRepoLanguages() : [];
  const rankedCount = languages.reduce((sum, { repos }) => sum + repos, 0);
  const languageCount = languages.find((l) => l.language === (rank?.language ?? null))?.repos;

  return (
    <>
      <Header />
      <RepoLayout repo={repo} languageUrl={rank?.language ? getRepoLanguageRankingPath(rank.language) : undefined}>
        {rank ? (
          <ProfileCardsGrid className="grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]">
            {!!rank.s && (
              <RepoRankCard
                title="Global rank"
                rank={rank.s}
                rankM={rank.sM}
                rankingLink={getRepoRankingPath(getRankingPageOf(rank.s))}
                rankedCount={rankedCount || undefined}
              />
            )}
            {!!rank.l && (
              <RepoRankCard
                title={rank.language ? `${rank.language} rank` : 'Rank without a language'}
                rank={rank.l}
                rankM={rank.lM}
                rankingLink={getRepoLanguageRankingPath(rank.language, getRankingPageOf(rank.l))}
                rankedCount={languageCount}
              />
            )}
          </ProfileCardsGrid>
        ) : (
          <ProfileCard>
            <p className="text-sm text-muted-foreground">
              {repo.stars >= REPO_MIN_RANK_STARS
                ? 'Not ranked yet: the repository joins the rankings at their next update.'
                : `Repositories are ranked from ${REPO_MIN_RANK_STARS} stars.`}
            </p>
          </ProfileCard>
        )}
        <StarHistorySection repo={repo} />
        {!!repo.history && <StarHistoryBadgeSection owner={repo.owner} name={repo.name} />}
        <RepoPulseArea repo={repo} pulse={pulse} />
      </RepoLayout>
    </>
  );
}
