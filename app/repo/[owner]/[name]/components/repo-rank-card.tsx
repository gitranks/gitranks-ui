import { TrendingDown, TrendingUp } from 'lucide-react';
import type { FC } from 'react';

import { ProfileCard, ProfileCardContent, ProfileCardHeader } from '@/app/profile/[login]/components/profile-card';
import { RankCardItem, RankCardPosition } from '@/components/rank-card/rank-card-item';
import { RankDelta } from '@/components/rank-delta/rank-delta';

type RepoRankCardProps = {
  title: string;
  rank: number;
  /** The rank at the start of the month. */
  rankM?: number | null;
  rankingLink: string;
  rankedCount?: number;
};

export const RepoRankCard: FC<RepoRankCardProps> = ({ title, rank, rankM, rankingLink, rankedCount }) => (
  <ProfileCard className="gap-0">
    <ProfileCardHeader>{title}</ProfileCardHeader>
    <ProfileCardContent className="mt-4">
      <RankCardPosition rank={rank} rankingLink={rankingLink} rankedCount={rankedCount} />
      {!!rankM && rank !== rankM && (
        <RankCardItem Icon={rank > rankM ? TrendingDown : TrendingUp}>
          <span>
            This month change: <RankDelta current={rank} previous={rankM} className="text-base" />
          </span>
        </RankCardItem>
      )}
    </ProfileCardContent>
  </ProfileCard>
);
