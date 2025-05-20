import { FC } from 'react';

import { Link } from '@/components/link/link';
import { RankDelta } from '@/components/rank-delta/rank-delta';
import { UserQuery } from '@/types/generated/graphql';

import { ProfileCard, ProfileCardActions, ProfileCardContent, ProfileCardHeader } from './profile-card';

type RanksOverviewProps = {
  ranksData: NonNullable<UserQuery['user']>['rank'];
  login: string;
};

export const RanksOverview: FC<RanksOverviewProps> = ({ ranksData, login }) => {
  return (
    <ProfileCard>
      <ProfileCardHeader>Ranks</ProfileCardHeader>
      <ProfileCardContent>
        <p>
          ⭐&nbsp;&nbsp;Stars rank: {ranksData?.ownedStars?.toLocaleString('en-US')}{' '}
          <RankDelta current={ranksData?.ownedStars} previous={ranksData?.ownedStarsM} />
        </p>
        <p>
          🔀&nbsp;&nbsp;Contributor rank: {ranksData?.contributedStars?.toLocaleString('en-US')}{' '}
          {false && <RankDelta current={ranksData?.contributedStars} previous={ranksData?.contributedStarsM} />}
        </p>
        <p>
          👥&nbsp;&nbsp;Followers rank: {ranksData?.followersCount?.toLocaleString('en-US')}{' '}
          <RankDelta current={ranksData?.followersCount} previous={ranksData?.followersCountM} />
        </p>
      </ProfileCardContent>
      <ProfileCardActions>
        <Link href={`/profile/${login}/ranks`}>View Details</Link>
      </ProfileCardActions>
    </ProfileCard>
  );
};
