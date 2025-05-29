import { FC } from 'react';

import { Link } from '@/components/link/link';
import { RankNumber } from '@/components/rank-number/rank-number';
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
        <div className="flex items-center">
          ⭐&nbsp;&nbsp;Stars rank:&nbsp;
          <RankNumber
            rank={ranksData?.ownedStars}
            rankPrevious={ranksData?.ownedStarsM}
            rankProvisional={ranksData?.ownedStarsProvisional}
          />
        </div>
        <div className="flex items-center">
          🔀&nbsp;&nbsp;Contributor rank:&nbsp;
          <RankNumber
            rank={ranksData?.contributedStars}
            rankPrevious={ranksData?.contributedStarsM}
            rankProvisional={ranksData?.contributedStarsProvisional}
            showDelta={false}
          />
        </div>
        <div className="flex items-center">
          👥&nbsp;&nbsp;Followers rank:&nbsp;
          <RankNumber
            rank={ranksData?.followersCount}
            rankPrevious={ranksData?.followersCountM}
            rankProvisional={ranksData?.followersCountProvisional}
          />
        </div>
      </ProfileCardContent>
      <ProfileCardActions>
        <Link href={`/profile/${login}/ranks`}>View Details</Link>
      </ProfileCardActions>
    </ProfileCard>
  );
};
