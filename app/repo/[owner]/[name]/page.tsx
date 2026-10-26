'use cache';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound, permanentRedirect } from 'next/navigation';

import { RepoHeader } from './components/repo-header';
import { RepoRankCard } from './components/repo-rank-card';
import { buildRepoMetadata, isRepoRanked } from './seo';
import { REPO_MIN_RANK_STARS } from '@/app/app.consts';
import { ProfileCardsGrid } from '@/app/profile/[login]/components/profile-card';
import { Header } from '@/components/header/header';
import { Page } from '@/components/page/page';
import { fetchRepo } from '@/graphql/helpers/fetch-repo';
import { fetchRepoLanguages } from '@/graphql/helpers/fetch-repo-languages';
import {
  getRankingPageOf,
  getRepoCacheTag,
  getRepoLanguageRankingPath,
  getRepoPath,
  getRepoRankingPath,
} from '@/utils/repo-paths';

// Renders on request as one piece, like the profile pages; cached data keeps the render cheap.
export const instant = false;

export async function generateMetadata({ params }: PageProps<'/repo/[owner]/[name]'>): Promise<Metadata> {
  const { owner, name } = await params;
  const repo = await fetchRepo(decodeURIComponent(owner), decodeURIComponent(name));

  if (!repo) {
    return {};
  }

  return buildRepoMetadata(repo);
}

export default async function RepoPage({ params }: PageProps<'/repo/[owner]/[name]'>) {
  const { owner: ownerParam, name: nameParam } = await params;
  const owner = decodeURIComponent(ownerParam);
  const name = decodeURIComponent(nameParam);
  cacheLife('hours');
  cacheTag(getRepoCacheTag(owner, name));

  const repo = await fetchRepo(owner, name);

  if (!repo) {
    notFound();
  }

  // Found by an earlier name: the repository was renamed or transferred.
  if (repo.renamedTo) {
    permanentRedirect(getRepoPath(repo.renamedTo));
  }

  const rank = isRepoRanked(repo) ? repo.rank : null;
  const languages = rank ? await fetchRepoLanguages() : [];
  const rankedCount = languages.reduce((sum, { repos }) => sum + repos, 0);
  const languageCount = languages.find((l) => l.language === (rank?.language ?? null))?.repos;
  const languageTitle = rank?.language ?? 'No language';

  return (
    <>
      <Header />
      <Page className="max-w-5xl w-full gap-6">
        <RepoHeader repo={repo} languageUrl={rank?.language ? getRepoLanguageRankingPath(rank.language) : undefined} />
        {rank ? (
          <ProfileCardsGrid>
            {!!rank.s && (
              <RepoRankCard
                title="Global Rank"
                rank={rank.s}
                rankM={rank.sM}
                rankingLink={getRepoRankingPath(getRankingPageOf(rank.s))}
                rankedCount={rankedCount || undefined}
              />
            )}
            {!!rank.l && (
              <RepoRankCard
                title={`${languageTitle} Rank`}
                rank={rank.l}
                rankM={rank.lM}
                rankingLink={getRepoLanguageRankingPath(rank.language, getRankingPageOf(rank.l))}
                rankedCount={languageCount}
              />
            )}
          </ProfileCardsGrid>
        ) : (
          <p className="text-sm text-muted-foreground">
            {repo.stars >= REPO_MIN_RANK_STARS
              ? 'Not ranked yet: the repository joins the rankings at their next update.'
              : `Repositories are ranked from ${REPO_MIN_RANK_STARS} stars.`}
          </p>
        )}
      </Page>
    </>
  );
}
