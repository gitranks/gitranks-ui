import { FC } from 'react';

import { Link } from '@/components/link/link';
import { RankNumber } from '@/components/rank-number/rank-number';
import { UserQuery } from '@/types/generated/graphql';

import { ProfileCard, ProfileCardActions, ProfileCardContent, ProfileCardHeader } from './profile-card';

type RanksOverviewProps = {
  ranksData: NonNullable<UserQuery['user']>['rankGlobal'];
  login: string;
};

export const RanksOverview: FC<RanksOverviewProps> = ({ ranksData, login }) => {
  return (
    <ProfileCard>
      <ProfileCardHeader>Ranks</ProfileCardHeader>
      <ProfileCardContent>
        <div className="flex items-center">
          ⭐&nbsp;&nbsp;Stars rank:&nbsp;
          <RankNumber rank={ranksData?.s} rankPrevious={ranksData?.sM} rankProvisional={ranksData?.sProvisional} />
        </div>
        <div className="flex items-center">
          🔀&nbsp;&nbsp;Contributor rank:&nbsp;
          <RankNumber
            rank={ranksData?.c}
            rankPrevious={ranksData?.cM}
            rankProvisional={ranksData?.cProvisional}
            showDelta={false}
          />
        </div>
        <div className="flex items-center">
          👥&nbsp;&nbsp;Followers rank:&nbsp;
          <RankNumber rank={ranksData?.f} rankPrevious={ranksData?.fM} rankProvisional={ranksData?.fProvisional} />
        </div>
      </ProfileCardContent>
      <ProfileCardActions>
        <Link href={`/profile/${login}/ranks`}>View Details</Link>
      </ProfileCardActions>
    </ProfileCard>
  );
};
