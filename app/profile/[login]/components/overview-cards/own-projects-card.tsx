import type { FC } from 'react';

import { LangListWithSources } from '../lang-list-with-sources';
import { ProfileCard, ProfileCardHeader } from '../profile-card';
import ChartStarsSnapshot from '@/components/chart-stars-snapshot/chart-stars-snapshot';
import type { PageProfileOverviewQuery } from '@/types/generated/graphql';
import { formatNumberShort } from '@/utils/format-number-short';

type OwnProjectsCardProps = {
  login: string;
  totalRankedUsers: number;
  userRank?: number | null;
  repoCount: number;
  repoStars: number;
  languages: NonNullable<PageProfileOverviewQuery['user']>['cLangs'];
  snapshots: NonNullable<PageProfileOverviewQuery['user']>['snapshots'];
};

export const OwnProjectsCard: FC<OwnProjectsCardProps> = ({
  login,
  repoCount,
  repoStars,
  languages,
  snapshots,
  totalRankedUsers,
  userRank,
}) => {
  const getTopRankedMessage = () => {
    if (!totalRankedUsers || !userRank) {
      return null;
    }

    const percentage = Math.max((userRank / totalRankedUsers) * 100, 0.1);

    return (
      <div className="flex items-center gap-1.5">
        {percentage > 50 ? 'Bottom' : 'Top'} {formatNumberShort(percentage > 50 ? 100 - percentage : percentage)}% of
        ranked profiles
      </div>
    );
  };

  const getCardContent = () => {
    if (!repoCount) {
      return <div className="flex grow items-center p-3 md:p-4">No public repositories.</div>;
    }

    return (
      <div className="flex flex-col gap-3">
        <ProfileCardHeader>
          <span className="font-semibold">Own Projects</span>
        </ProfileCardHeader>
        <div className="flex flex-col gap-1.5">
          <div className="flex-inline items-center">
            {repoCount} public repositories{' '}
            {!!repoStars && (
              <>
                {' '}
                with <span className="font-semibold">{formatNumberShort(repoStars)}</span> stars
              </>
            )}
          </div>
          {getTopRankedMessage()}
          {!!languages?.length && (
            <div className="flex gap-2 flex-wrap leading-tight">
              Languages:
              <LangListWithSources languages={languages} login={login} />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <ProfileCard className="gap-2">
      {getCardContent()}
      <ChartStarsSnapshot snapshots={snapshots} metric="s" className="mt-auto" />
    </ProfileCard>
  );
};
