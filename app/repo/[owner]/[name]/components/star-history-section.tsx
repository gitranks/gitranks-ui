import type { FC } from 'react';

import { PullButton } from './pull-button';
import StarHistoryChart from './star-history-chart';
import { ProfileCard, ProfileCardHeader } from '@/app/profile/[login]/components/profile-card';
import type { PageRepoQuery } from '@/types/generated/graphql';

type StarHistorySectionProps = {
  repo: NonNullable<PageRepoQuery['repo']>;
};

const DATE_FORMATTER = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });

export const StarHistorySection: FC<StarHistorySectionProps> = ({ repo }) => {
  const { owner, name, history, burstMonths, pull } = repo;

  return (
    <ProfileCard className="gap-3">
      <ProfileCardHeader>Star history</ProfileCardHeader>
      {history ? (
        <>
          <div className="h-[260px]">
            <StarHistoryChart history={history} burstMonths={burstMonths} />
          </div>
          <p className="text-xs text-muted-foreground">
            {history.current.stars.toLocaleString('en-US')} stars on{' '}
            {DATE_FORMATTER.format(new Date(history.current.date))}.
            {!!burstMonths?.length && ' Shaded months gained stars much faster than the months before them.'}
            {!history.complete && ' The earliest months are estimates.'}
          </p>
          <p className="text-xs text-muted-foreground">
            Current stargazers by the date they starred: unstars and deleted accounts do not show.
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No star history for this repository yet. Fetch it from GitHub to see how its stars grew.
        </p>
      )}
      <PullButton owner={owner} name={name} pull={pull} />
    </ProfileCard>
  );
};
