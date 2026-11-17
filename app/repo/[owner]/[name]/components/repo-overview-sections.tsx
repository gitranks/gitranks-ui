import type { FC } from 'react';

import { isRepoRanked } from '../seo';
import { buildRepoSummary } from '../utils/repo-summary';
import { RepoRankCard } from './repo-rank-card';
import { RepoTierCard } from './repo-tier-card';
import { StarHistorySection } from './star-history-section';
import { StarsBestSection } from './stars-best-section';
import { WhoBuildsItCard } from './who-builds-it-card';
import { REPO_MIN_RANK_STARS } from '@/app/app.consts';
import { ProfileCard, ProfileCardsGrid } from '@/app/profile/[login]/components/profile-card';
import { ProfileSummary } from '@/app/profile/[login]/components/profile-summary';
import type { PageRepoQuery, RepoLanguagesQuery, RepoRankTiersQuery } from '@/types/generated/graphql';
import { getRankingPageOf, getRepoLanguageRankingPath, getRepoRankingPath } from '@/utils/repo-paths';

type RepoOverviewSectionsProps = {
  repo: NonNullable<PageRepoQuery['repo']>;
  /** Every language with ranked repositories; empty for an unranked repository, which shows no ranked counts. */
  languages: readonly RepoLanguagesQuery['repoLanguages'][number][];
  /** The global repository tier table; null until one is built or when it could not be read. */
  tiers: RepoRankTiersQuery['repoRankTiers'];
};

/**
 * The repository page's overview: the first row of cards (its tier or ranks, and who builds it), Starred by the best,
 * the summary sentence and the star history.
 */
export const RepoOverviewSections: FC<RepoOverviewSectionsProps> = ({ repo, languages, tiers }) => {
  const rank = isRepoRanked(repo) ? repo.rank : null;
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
      <div className="flex flex-col gap-4">
        <ProfileCardsGrid className="grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))]">
          {rank?.tier ? (
            // The tier card carries the language rank in its footer.
            <RepoTierCard
              rank={{ ...rank, tier: rank.tier }}
              stars={repo.stars}
              starsCheck={repo.starsCheck}
              gainedThisMonth={repo.gainedThisMonth}
              tiers={tiers?.tiers}
            />
          ) : rank ? (
            <>
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
    </>
  );
};
