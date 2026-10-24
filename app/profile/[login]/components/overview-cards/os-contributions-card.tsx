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
      <div className="text-sm">
        {percentage > 50 ? 'Bottom' : 'Top'} {formatNumberShort(percentage > 50 ? 100 - percentage : percentage)}% of
        ranked profiles
      </div>
    );
  };

  const getTooltip = () => (
    <AdaptiveTooltip
      trigger={
        <button type="button" aria-label="What counts as a contribution?" className="text-muted-foreground">
          <InfoIcon className="size-4" />
        </button>
      }
    >
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
      return <p className="text-sm text-muted-foreground">This profile has no public contributions.</p>;
    }

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-3xl font-semibold tracking-tight tabular-nums">
            {formatNumberShort(repoStars)}
          </span>
          <span className="text-sm text-muted-foreground">
            {repoStars === 1 ? 'star' : 'stars'} on {repoCount.toLocaleString('en-US')}{' '}
            {repoCount === 1 ? 'repository' : 'repositories'} contributed to
          </span>
        </div>
        {getTopRankedMessage()}
        {!!languages?.length && (
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm leading-tight">
            <span className="text-muted-foreground">Languages:</span>
            <LangListWithSources languages={languages} login={login} />
          </div>
        )}
      </div>
    );
  };

  return (
    <ProfileCard className="gap-3">
      <ProfileCardHeader meta={getTooltip()}>Open source contributions</ProfileCardHeader>
      {getCardContent()}
      <ChartStarsSnapshot snapshots={snapshots} metric="c" className="mt-auto" />
    </ProfileCard>
  );
};
