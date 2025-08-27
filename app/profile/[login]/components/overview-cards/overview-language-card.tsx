import { FC, ReactNode } from 'react';
import { FiArrowRight } from 'react-icons/fi';

import { ChartLanguages } from '@/components/chart-languages/chart-languages';
import { Link } from '@/components/link/link';

import { ProfileCard } from '../profile-card';

type ProfileLanguageCardProps = {
  children: ReactNode;
};

export const ProfileLanguageCard: FC<ProfileLanguageCardProps> = ({ login, languages }) => {
  console.log(languages);
  return (
    <ProfileCard className="gap-0 p-0 md:p-0 overflow-hidden relative">
      <div className="flex gap-2 grow">
        <div className="shrink-0 flex items-center p-2">
          <ChartLanguages languages={languages} />
        </div>
        <div className="flex flex-col items-center grow p-3">
          <div className="flex flex-col grow justify-center gap-3">
            <div className="flex flex-col">
              <div className="">Language by Rank</div>
              <div className="text-2xl font-semibold">CSS</div>
            </div>
            <div className="flex flex-col">
              <div className="">Language by Size</div>
              <div className="text-2xl font-semibold">JavaScript</div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-12 flex items-center justify-between border-t-1 border-muted py-2 gap-4">
        <div className="flex flex-wrap gap-x-2 pl-2 text-muted-foreground text-sm">
          {languages.map((lang) => (
            <div key={lang.name} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lang.color }} />
              {lang.name}
            </div>
          ))}
        </div>

        <Link
          href={`/profile/${login}/languages`}
          className="flex items-center justify-center px-3 min-w-[140px] gap-1"
        >
          View Details <FiArrowRight />
        </Link>
      </div>
    </ProfileCard>
  );
};
