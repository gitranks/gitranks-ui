import type { FC } from 'react';

import { buildRepoSEO, isRepoRanked } from '../seo';
import { RepoContributorsSections } from './repo-contributors-sections';
import { RepoLayout } from './repo-layout';
import { RepoOverviewSections } from './repo-overview-sections';
import type { RepoFacts } from '@/badge/v3/facts';
import { BadgesCard } from '@/components/badges-card/badges-card';
import { Header } from '@/components/header/header';
import { JsonLd } from '@/components/json-ld/json-ld';
import type { RepoPulseFactsRead } from '@/graphql/helpers/fetch-repo-pulse';
import type { PageRepoQuery, RepoLanguagesQuery, RepoRankTiersQuery } from '@/types/generated/graphql';
import { getRepoLanguageRankingPath } from '@/utils/repo-paths';

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

  return (
    <>
      <Header />
      <RepoLayout repo={repo} languageUrl={rank?.language ? getRepoLanguageRankingPath(rank.language) : undefined}>
        <JsonLd payloads={buildRepoSEO(repo).jsonLd} />
        <RepoOverviewSections repo={repo} languages={languages} tiers={tiers} />
        <BadgesCard entity={badgeFacts} />
        <RepoContributorsSections repo={repo} pulse={pulse} />
      </RepoLayout>
    </>
  );
};
