import { FC } from 'react';
import { FiGitPullRequest, FiStar, FiUsers, FiArrowRight } from 'react-icons/fi';

import { Link } from '@/components/link/link';
import { RankChart } from '@/components/rank-chart/rank-chart';

import { ProfileCard } from '../profile-card';

type ProfileRankCardProps = {
  login: string;
};

export const ProfileRankCard: FC<ProfileRankCardProps> = ({ login, bestTier }) => {
  return (
    <ProfileCard className="gap-0 p-0 md:p-0 overflow-hidden relative">
      <div className="flex gap-2 grow">
        <div className="shrink-0">
          <RankChart progress={bestTier.data} />
        </div>
        <div className="flex flex-col items-center grow p-3">
          <div className="flex flex-col grow justify-center gap-3">
            <div className="flex flex-col">
              <div className="">Global Rank</div>
              <div className="text-2xl font-semibold">Advanced 5</div>
            </div>
            <div className="flex flex-col">
              <div className="">Persona</div>
              <div className="text-2xl font-semibold">Contributor</div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-12 flex items-center justify-between border-t-1 border-muted py-2 overflow-hidden">
        <div className="grid grid-cols-3">
          <div className="flex flex-col items-center text-sm border-r-1 px-3 text-muted-foreground min-w-[60px]">
            <FiStar /> #234,234
          </div>
          <div className="flex flex-col items-center text-sm border-r-1 px-3 text-muted-foreground min-w-[60px]">
            <FiGitPullRequest /> #123,344
          </div>
          <div className="flex flex-col items-center text-sm border-r-1 px-3 text-muted-foreground min-w-[60px]">
            <FiUsers /> #23,234
          </div>
        </div>

        <Link href={`/profile/${login}/ranks`} className="flex items-center justify-center px-3 min-w-[140px] gap-x-1">
          Explore Ranks <FiArrowRight />
        </Link>
      </div>
    </ProfileCard>
  );
};
