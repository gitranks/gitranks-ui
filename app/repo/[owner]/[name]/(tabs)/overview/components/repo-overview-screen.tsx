import type { FC } from 'react';

import { RepoOverviewSections } from '../../../components/repo-overview-sections';
import { buildRepoSEO } from '../../../seo';
import { UsedByCard } from './used-by-card';
import { JsonLd } from '@/components/json-ld/json-ld';
import { LearnEntityCard } from '@/components/learn/entity/learn-entity-card';
import type { Unavailable } from '@/graphql/helpers/fetch-repo-packages';
import type { RepoPackages, RepoUsedBy } from '@/graphql/repo-packages';
import type { LearnEntityCard as LearnEntityCardData } from '@/lib/learn/entity-card';
import type { PageRepoQuery, RepoLanguagesQuery, RepoRankTiersQuery } from '@/types/generated/graphql';

type RepoOverviewScreenProps = {
  repo: NonNullable<PageRepoQuery['repo']>;
  languages: readonly RepoLanguagesQuery['repoLanguages'][number][];
  tiers: RepoRankTiersQuery['repoRankTiers'];
  /** Its packages: `null` when it publishes none, "unavailable" when they could not be read. */
  packages: RepoPackages | null | Unavailable;
  /** Its most-starred dependents; `null` when there are none to show. */
  dependents: RepoUsedBy | null | Unavailable;
  /** What Learn has about the repository; `null` when it has nothing, or the card could not be read. */
  learnCard: LearnEntityCardData | null;
};

/**
 * The repository's Overview tab: today's overview sections, the Used by card when repositories with 100+ stars use
 * its packages (left out without package data), and last the Learn card when Learn has something about it.
 */
export const RepoOverviewScreen: FC<RepoOverviewScreenProps> = ({
  repo,
  languages,
  tiers,
  packages,
  dependents,
  learnCard,
}) => (
  <>
    <JsonLd payloads={buildRepoSEO(repo).jsonLd} />
    <RepoOverviewSections repo={repo} languages={languages} tiers={tiers} />
    {packages &&
      packages !== 'unavailable' &&
      packages.dependents > 0 &&
      dependents &&
      dependents !== 'unavailable' &&
      dependents.items.length > 0 && (
        <UsedByCard nameWithOwner={repo.nameWithOwner} packages={packages} rows={dependents.items} />
      )}
    <LearnEntityCard card={learnCard} entity={{ kind: 'repo', repo: repo.nameWithOwner }} />
  </>
);
