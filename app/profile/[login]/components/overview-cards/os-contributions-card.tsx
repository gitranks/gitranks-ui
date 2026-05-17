import { InfoIcon } from 'lucide-react';
import type { FC } from 'react';

import { LangListWithSources } from '../lang-list-with-sources';
import { ProfileCard, ProfileCardHeader } from '../profile-card';
import { AdaptiveTooltip } from '@/components/adaptive-tooltip/adaptive-tooltip';
import ChartStarsSnapshot from '@/components/chart-stars-snapshot/chart-stars-snapshot';
import type { PageProfileOverviewQuery } from '@/types/generated/graphql';
import { formatNumberShort } from '@/utils/format-number-short';

type OsContributionsCardProps = {
  login: string;
  totalRankedUsers: number;
  userRank?: number | null;
  repoCount: number;
  repoStars: number;
  languages: NonNullable<PageProfileOverviewQuery['user']>['cLangs'];
  snapshots: NonNullable<PageProfileOverviewQuery['user']>['snapshots'];
};

export const OsContributionsCard: FC<OsContributionsCardProps> = ({
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

  const getTooltip = () => (
    <AdaptiveTooltip trigger={<InfoIcon size={20} />}>
      <div className="max-w-80 text-sm">
        <div>
          <b>What counts as a contribution?</b>
        </div>
        <div className="mt-1">
          We count <b>merged pull requests</b> to <b>public repositories not owned by this profile</b> as open source
          contributions.
        </div>
        <div className="mt-1">
          This helps highlight meaningful collaboration with open source projects outside of your own repositories.
        </div>
      </div>
    </AdaptiveTooltip>
  );

  const getCardContent = () => {
    if (!repoCount) {
      return <div className="flex grow items-center p-3 md:p-4">This profile has no public contributions.</div>;
    }

    return (
      <div className="flex flex-col gap-3">
        <ProfileCardHeader meta={getTooltip()}>
          <span className="font-semibold">Open Source Contributions</span>
        </ProfileCardHeader>
        <div className="flex flex-col gap-1.5">
          <div className="flex-inline items-center">
            Contributed to {repoCount} repositories{' '}
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
              Languages: <LangListWithSources languages={languages} login={login} />
            </div>
          )}
        </div>
      </div>
    );
  };
  return (
    <ProfileCard className="gap-2">
      {getCardContent()}
      <ChartStarsSnapshot snapshots={snapshots} metric="c" className="mt-auto" />
    </ProfileCard>
  );
};
