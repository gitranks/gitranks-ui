import type { FC } from 'react';

import { LangListWithSources } from '../lang-list-with-sources';
import { ProfileCard, ProfileCardHeader } from '../profile-card';
import ChartStarsSnapshot from '@/components/chart-stars-snapshot/chart-stars-snapshot';
import { type StarsNotCountedTotal, StarTotalCount } from '@/components/star-count/star-count';
import type { PageProfileOverviewQuery } from '@/types/generated/graphql';
import { formatNumberShort } from '@/utils/format-number-short';

type OwnProjectsCardProps = {
  login: string;
  totalRankedUsers: number;
  userRank?: number | null;
  repoCount: number;
  repoStars: number;
  /** The stars of the developer's repositories that don't count, struck through before the total. */
  starsNotCounted?: StarsNotCountedTotal | null;
  languages: NonNullable<PageProfileOverviewQuery['user']>['cLangs'];
  snapshots: NonNullable<PageProfileOverviewQuery['user']>['snapshots'];
};

export const OwnProjectsCard: FC<OwnProjectsCardProps> = ({
  login,
  repoCount,
  repoStars,
  starsNotCounted,
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

  const getCardContent = () => {
    if (!repoCount) {
      return <p className="text-sm text-muted-foreground">No public repositories.</p>;
    }

    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <StarTotalCount
            stars={repoStars}
            notCounted={starsNotCounted}
            format="compact"
            numberClassName="font-mono tabular-nums"
            className="text-3xl font-semibold tracking-tight"
            struckClassName="text-lg"
            gapClassName="gap-x-2"
          />
          <span className="text-sm text-muted-foreground">
            {repoStars === 1 ? 'star' : 'stars'} across {repoCount.toLocaleString('en-US')} public{' '}
            {repoCount === 1 ? 'repository' : 'repositories'}
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
      <ProfileCardHeader>Own projects</ProfileCardHeader>
      {getCardContent()}
      <ChartStarsSnapshot snapshots={snapshots} metric="s" className="mt-auto" />
    </ProfileCard>
  );
};
