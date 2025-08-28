import { FC } from 'react';
import { FiArrowRight } from 'react-icons/fi';

import BarChartLanguages from '@/components/chart-languages/bar-chart-languages';
import { Link } from '@/components/link/link';
import { ProfileOverviewQuery } from '@/types/generated/graphql';

import { ProfileCard } from '../profile-card';

type ProfileLanguageCardProps = {
  login: string;
  languages?: NonNullable<ProfileOverviewQuery['user']>['languages'];
};

export const ProfileLanguageCard: FC<ProfileLanguageCardProps> = ({ login, languages }) => {
  return (
    <ProfileCard className="gap-2">
      <div className="text-lg">Top 3 Languages By Stars (i)</div>
      <BarChartLanguages languages={languages} />
      <Link href={`/profile/${login}/languages`} className="flex items-center min-w-[140px] gap-1 justify-end">
        All Languages <FiArrowRight />
      </Link>
    </ProfileCard>
  );
};
