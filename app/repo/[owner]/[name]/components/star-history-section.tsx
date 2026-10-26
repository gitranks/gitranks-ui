import type { FC } from 'react';

import { getStarHistoryNote } from '../utils/star-history';
import { PullButton } from './pull-button';
import StarHistoryChart from './star-history-chart';
import { ProfileCard, ProfileCardHeader } from '@/app/profile/[login]/components/profile-card';
import type { PageRepoQuery } from '@/types/generated/graphql';

type StarHistorySectionProps = {
  repo: NonNullable<PageRepoQuery['repo']>;
};

export const StarHistorySection: FC<StarHistorySectionProps> = ({ repo }) => {
  const { owner, name, history, burstMonths, pull } = repo;
  const note = history ? getStarHistoryNote(history, burstMonths) : '';

  return (
    <ProfileCard className="gap-3">
      <ProfileCardHeader>Star history</ProfileCardHeader>
      {history ? (
        <>
          <div className="h-[260px]">
            <StarHistoryChart history={history} burstMonths={burstMonths} />
          </div>
          {!!note && <p className="text-xs text-muted-foreground">{note}</p>}
          <p className="text-xs text-muted-foreground">
            Current stargazers by the date they starred: unstars and deleted accounts do not show.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No star history for this repository yet. Fetch it from GitHub to see how its stars grew.
        </p>
      )}
      <PullButton owner={owner} name={name} pull={pull && { status: pull.status, requestedAt: pull.requestedAt }} />
    </ProfileCard>
  );
};
