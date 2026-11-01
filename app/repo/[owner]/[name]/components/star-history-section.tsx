import type { FC } from 'react';

import { getStarHistoryNoteParts } from '../utils/star-history';
import StarHistoryChart from './star-history-chart';
import { ProfileCard, ProfileCardHeader } from '@/app/profile/[login]/components/profile-card';
import { StarCount } from '@/components/star-count/star-count';
import type { PageRepoQuery } from '@/types/generated/graphql';

type StarHistorySectionProps = {
  repo: NonNullable<PageRepoQuery['repo']>;
};

export const StarHistorySection: FC<StarHistorySectionProps> = ({ repo }) => {
  const { history, burstMonths, starsCheck } = repo;
  const note = history ? getStarHistoryNoteParts(history, burstMonths) : null;

  return (
    <ProfileCard className="gap-3">
      <ProfileCardHeader>
        <h2>Star history</h2>
      </ProfileCardHeader>
      {history ? (
        <>
          <div className="h-[260px]">
            <StarHistoryChart history={history} burstMonths={burstMonths} starsCheck={starsCheck} />
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            {!!note && (note.current || note.notes.length > 0) && (
              <p>
                {note.current && (
                  <>
                    <StarCount
                      stars={note.current.stars}
                      githubStars={starsCheck?.githubStars}
                      notCounted={starsCheck?.notCounted}
                      numberClassName={starsCheck ? 'font-mono tabular-nums' : undefined}
                      suffix=" stars"
                    />{' '}
                    on {note.current.date}.
                  </>
                )}
                {note.notes.map((text, index) => `${note.current || index > 0 ? ' ' : ''}${text}`)}
              </p>
            )}
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
