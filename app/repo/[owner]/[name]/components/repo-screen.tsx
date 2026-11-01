import type { FC } from 'react';

import { buildRepoSEO, isRepoRanked } from '../seo';
import { buildRepoSummary } from '../utils/repo-summary';
import { RepoLayout } from './repo-layout';
import { RepoPulseArea } from './repo-pulse-area';
import { RepoRankCard } from './repo-rank-card';
import { RepoTierCard } from './repo-tier-card';
import { StarHistorySection } from './star-history-section';
import { StarsBestSection } from './stars-best-section';
import { WhoBuildsItCard } from './who-builds-it-card';
import { REPO_MIN_RANK_STARS } from '@/app/app.consts';
import { ProfileCard, ProfileCardsGrid } from '@/app/profile/[login]/components/profile-card';
import { ProfileSummary } from '@/app/profile/[login]/components/profile-summary';
import type { RepoFacts } from '@/badge/v3/facts';
import { BadgesCard } from '@/components/badges-card/badges-card';
import { Header } from '@/components/header/header';
import { JsonLd } from '@/components/json-ld/json-ld';
import type { RepoPulseFactsRead } from '@/graphql/helpers/fetch-repo-pulse';
import type { PageRepoQuery, RepoLanguagesQuery, RepoRankTiersQuery } from '@/types/generated/graphql';
import { getRankingPageOf, getRepoLanguageRankingPath, getRepoRankingPath } from '@/utils/repo-paths';

type RepoScreenProps = {
  repo: NonNullable<PageRepoQuery['repo']>;
  pulse: RepoPulseFactsRead['pulse'];
  /** Every language with ranked repositories; empty for an unranked repository, which shows no ranked counts. */
  languages: readonly RepoLanguagesQuery['repoLanguages'][number][];
  /** The global repository tier table; null until one is built or when it could not be read. */
  tiers: RepoRankTiersQuery['repoRankTiers'];
  /** The repository's badge data, for its Badges card. */
  badgeFacts: RepoFacts | null;
};

/** The repository page from its data: its ranks and tier, who builds it, its star history, badges and analytics. */
export const RepoScreen: FC<RepoScreenProps> = ({ repo, pulse, languages, tiers, badgeFacts }) => {
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
                    tiers={tiers?.tiers}
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
        <BadgesCard entity={badgeFacts} />
        <RepoPulseArea repo={repo} pulse={pulse} />
      </RepoLayout>
    </>
  );
};
