import { FC } from 'react';

import { Timeline, TimelineDescription, TimelineItem, TimelineTime } from '@/components/timeline/timeline';
import { Contribution } from '@/types/generated/graphql';

import { ContributionRepositoryCard } from './contribution-repository-card';
import { groupAndSortContributions } from '../../utils/contrib-group-and-sort';

type UserContriutionsListProps = {
  contributions: Contribution[] | null | undefined;
  login: string;
};

export const UserContriutionsList: FC<UserContriutionsListProps> = ({ contributions, login }) => {
  if (!contributions?.length) {
    return null;
  }

  const sortedContributions = groupAndSortContributions(contributions);

  return (
    <>
      <h2 className="text-xl font-semibold mt-6">Contributions</h2>
      <Timeline>
        {sortedContributions.map((contribution) => (
          <TimelineItem key={contribution.year}>
            <TimelineTime>
              {contribution.year} • {`${contribution.data.length} repositories`}
            </TimelineTime>
            <TimelineDescription>
              {contribution.data.map((item) => (
                <ContributionRepositoryCard
                  key={item.repository?.githubId}
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
    </>
  );
};
