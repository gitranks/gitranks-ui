import type { FC } from 'react';

import { RepoPulseArea } from './repo-pulse-area';
import type { RepoPulseFactsRead } from '@/graphql/helpers/fetch-repo-pulse';
import type { PageRepoQuery } from '@/types/generated/graphql';

type RepoContributorsSectionsProps = {
  repo: Pick<NonNullable<PageRepoQuery['repo']>, 'owner' | 'name' | 'stars' | 'createdAt'>;
  pulse: RepoPulseFactsRead['pulse'];
};

/**
 * The repository page's analytics: Code, Contributors with the top contributors, and their countries; without
 * analytics, the note on the star threshold or nothing.
 */
export const RepoContributorsSections: FC<RepoContributorsSectionsProps> = ({ repo, pulse }) => (
  <RepoPulseArea repo={repo} pulse={pulse} />
);
