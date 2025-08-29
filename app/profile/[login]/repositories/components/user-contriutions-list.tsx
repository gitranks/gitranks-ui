'use client';

import { FC, useMemo, useState } from 'react';

import { Timeline, TimelineDescription, TimelineItem, TimelineTime } from '@/components/timeline/timeline';
import { Button } from '@/components/ui/button';
import { graphqlClient } from '@/lib/graphql/graphql-client';
import { Contribution, PageProfileRepositoriesQuery, ProfileContributionsDocument } from '@/types/generated/graphql';

import { ContributionRepositoryCard } from './contribution-repository-card';
import { groupAndSortContributions } from '../../utils/contrib-group-and-sort';

type UserContributionsListProps = {
  contributions?: NonNullable<PageProfileRepositoriesQuery['user']>['contributions'] | null;
  login: string;
  contributionCount?: boolean;
  loadMore?: boolean;
};

const LOADED_BY_DEFAULT = 10;
const CHUNK_SIZE = 20;

export const UserContributionsList: FC<UserContributionsListProps> = ({
  contributions: defaultContributions,
  login,
  contributionCount,
  loadMore,
}) => {
  const [contributions, setContributions] = useState((defaultContributions ?? []) as Contribution[]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(
    loadMore && !!defaultContributions && defaultContributions.length >= LOADED_BY_DEFAULT,
  );

  const sortedContributions = useMemo(() => groupAndSortContributions(contributions), [contributions]);

  if (!contributions.length) {
    return null;
  }

  const loadedCount = contributions.length;

  const handleLoadMore = async () => {
    setIsLoading(true);

    try {
      const { user } =
        (await graphqlClient(ProfileContributionsDocument, { login, limit: CHUNK_SIZE, offset: loadedCount })) ?? {};
      const newContributions = (user?.contributions ?? []) as Contribution[];

      setContributions((prev) => [...prev, ...newContributions]);
      setHasMore(newContributions.length === CHUNK_SIZE);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading more contributions:', error);
      setIsLoading(false);
    }
  };

  return (
    <>
      <Timeline>
        {sortedContributions.map((contribution) => (
          <TimelineItem key={contribution.year}>
            <TimelineTime>
              {contribution.year}
              {contributionCount ? ` • ${contribution.data.length} repositories` : ''}
            </TimelineTime>
            <TimelineDescription>
              {contribution.data.map((item) => (
                <ContributionRepositoryCard
                  key={item.repository?.name}
                  repository={item.repository}
                  prsCount={item.prsCount}
                  mergedPrsCount={item.mergedPrsCount}
                  linesAdded={item.linesAdded}
                  linesRemoved={item.linesRemoved}
                  login={login}
                />
              ))}
            </TimelineDescription>
          </TimelineItem>
        ))}
      </Timeline>
      {hasMore && (
        <Button disabled={isLoading} onClick={handleLoadMore} variant="outline" className="flex-grow-0 self-start">
          {isLoading ? 'Loading...' : `Show more`}
        </Button>
      )}
    </>
  );
};
