'use cache';

import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { notFound, permanentRedirect } from 'next/navigation';

import { RepoLayout } from './components/repo-layout';
import { RepoPulseArea } from './components/repo-pulse-area';
import { RepoRankCard } from './components/repo-rank-card';
import { RepoTierCard } from './components/repo-tier-card';
import { StarHistorySection } from './components/star-history-section';
import { StarsBestSection } from './components/stars-best-section';
import { WhoBuildsItCard } from './components/who-builds-it-card';
import { buildRepoSEO, isRepoRanked } from './seo';
import { buildRepoSummary } from './utils/repo-summary';
import { REPO_MIN_RANK_STARS } from '@/app/app.consts';
import { ProfileCard, ProfileCardsGrid } from '@/app/profile/[login]/components/profile-card';
import { ProfileSummary } from '@/app/profile/[login]/components/profile-summary';
import { readBadgeFacts } from '@/badge/v3/card-facts';
import { loadBadgeRepoCard } from '@/badge/v3/load';
import { PROMOTION } from '@/badge/v3/promotion';
import { BadgesCard } from '@/components/badges-card/badges-card';
import { Header } from '@/components/header/header';
import { JsonLd } from '@/components/json-ld/json-ld';
import { fetchRepo } from '@/graphql/helpers/fetch-repo';
import { fetchRepoLanguages } from '@/graphql/helpers/fetch-repo-languages';
import { fetchRepoPulseFacts } from '@/graphql/helpers/fetch-repo-pulse';
import { fetchRepoRankTiers } from '@/graphql/helpers/fetch-repo-rank-tiers';
import {
  getRankingPageOf,
  getRepoCacheTag,
  getRepoLanguageRankingPath,
  getRepoPath,
  getRepoRankingPath,
  parseRepoParams,
} from '@/utils/repo-paths';

/** From here a repository's promoted set has badges that need no rank. */
const REPO_BIG_PROMOTION_STARS = PROMOTION.repo.at(-1)?.from ?? 1_000;

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
  if (!rankTiers.ok || !badges.ok) {
    // A failed read of the tier table or the badge data: try again in minutes rather than keep the page without
    // that part for hours.
    cacheLife('minutes');
  }
  const rankedCount = languages.reduce((sum, { repos }) => sum + repos, 0);
  const languageCount = languages.find((l) => l.language === (rank?.language ?? null))?.repos;
  const summary = buildRepoSummary({
    ...repo,
    rank,
    rankedCount: rankedCount || undefined,
    languageCount,
    updatedAt: repo.history?.readAt,
  });

  return (
    <>
      <Header />
      <RepoLayout repo={repo} languageUrl={rank?.language ? getRepoLanguageRankingPath(rank.language) : undefined}>
        <JsonLd payloads={buildRepoSEO(repo).jsonLd} />
        <div className="flex flex-col gap-4">
          <ProfileCardsGrid className="grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]">
            {rank ? (
              <>
                {rank.tier ? (
                  <RepoTierCard
                    rank={{ ...rank, tier: rank.tier }}
                    stars={repo.stars}
                    gainedThisMonth={repo.gainedThisMonth}
                    tiers={rankTiers.tiers?.tiers}
                  />
                ) : (
                  !!rank.s && (
                    <RepoRankCard
                      title="Global rank"
                      rank={rank.s}
                      rankM={rank.sM}
                      rankingLink={getRepoRankingPath(getRankingPageOf(rank.s))}
                      rankedCount={rankedCount || undefined}
                    />
                  )
                )}
                {/* The tier card carries the language rank in its footer. */}
                {!rank.tier && !!rank.l && (
                  <RepoRankCard
                    title={rank.language ? `${rank.language} rank` : 'Rank without a language'}
                    rank={rank.l}
                    rankM={rank.lM}
                    rankingLink={getRepoLanguageRankingPath(rank.language, getRankingPageOf(rank.l))}
                    rankedCount={languageCount}
                  />
                )}
              </>
            ) : (
              <ProfileCard className="self-start">
                <p className="text-sm text-muted-foreground">
                  {repo.stars >= REPO_MIN_RANK_STARS
                    ? 'Not ranked yet: the repository joins the rankings at their next update.'
                    : `Repositories are ranked from ${REPO_MIN_RANK_STARS} stars.`}
                </p>
              </ProfileCard>
            )}
            <WhoBuildsItCard
              nameWithOwner={repo.nameWithOwner}
              stars={repo.stars}
              siblings={repo.siblings}
              builtBy={repo.builtBy}
            />
          </ProfileCardsGrid>
          <StarsBestSection starsBest={repo.starsBest} repoTier={rank?.tier?.tier} />
          <ProfileSummary parts={summary} />
        </div>
        <StarHistorySection repo={repo} />
        <BadgesCard entity={badges.facts} />
        <RepoPulseArea repo={repo} pulse={pulse} />
      </RepoLayout>
    </>
  );
}
