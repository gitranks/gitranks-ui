import type { FC } from 'react';

import { getStarHistoryNote } from '../utils/star-history';
import StarHistoryChart from './star-history-chart';
import { ProfileCard, ProfileCardHeader } from '@/app/profile/[login]/components/profile-card';
import type { PageRepoQuery } from '@/types/generated/graphql';

type StarHistorySectionProps = {
  repo: NonNullable<PageRepoQuery['repo']>;
};

export const StarHistorySection: FC<StarHistorySectionProps> = ({ repo }) => {
  const { history, burstMonths } = repo;
  const note = history ? getStarHistoryNote(history, burstMonths) : '';

  return (
    <ProfileCard className="gap-3">
      <ProfileCardHeader>
        <h2>Star history</h2>
      </ProfileCardHeader>
      {history ? (
        <>
          <div className="h-[260px]">
            <StarHistoryChart history={history} burstMonths={burstMonths} />
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            {!!note && <p>{note}</p>}
            <p>Current stargazers by the date they starred: unstars and deleted accounts do not show.</p>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No star history for this repository yet. Press Refresh to fetch it from GitHub and see how its stars grew.
        </p>
      )}
    </ProfileCard>
  );
};
