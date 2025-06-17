import { FC } from 'react';

import { Link } from '@/components/link/link';
import { RankNumber } from '@/components/rank-number/rank-number';
import { ProfileSummaryQuery } from '@/types/generated/graphql';

import { ProfileCard, ProfileCardActions, ProfileCardContent, ProfileCardHeader } from './profile-card';

type RanksOverviewProps = {
  ranksData:
    | NonNullable<ProfileSummaryQuery['user']>['rankGlobal']
    | NonNullable<ProfileSummaryQuery['user']>['rankCountry'];
  title: string;
  detailsLink: string;
};

export const RanksOverview: FC<RanksOverviewProps> = ({ ranksData, title, detailsLink }) => {
  return (
    <ProfileCard>
      <ProfileCardHeader>{title}</ProfileCardHeader>
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
        <Link href={detailsLink}>View Details</Link>
      </ProfileCardActions>
    </ProfileCard>
  );
};
