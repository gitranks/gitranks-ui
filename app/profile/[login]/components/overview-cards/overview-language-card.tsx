import { InfoIcon } from 'lucide-react';
import { FC } from 'react';
import { FiArrowRight } from 'react-icons/fi';

import { AdaptiveTooltip } from '@/components/adaptive-tooltip/adaptive-tooltip';
import BarChartLanguages from '@/components/chart-languages/bar-chart-languages';
import { Link } from '@/components/link/link';
import { PageProfileOverviewQuery } from '@/types/generated/graphql';

import { ProfileCard, ProfileCardHeader } from '../profile-card';

type ProfileLanguageCardProps = {
  login: string;
  languages?: NonNullable<PageProfileOverviewQuery['user']>['languages'];
};

export const ProfileLanguageCard: FC<ProfileLanguageCardProps> = ({ login, languages }) => {
  const getCardContent = () => {
    if (!languages?.length) {
      return (
        <div className="flex grow items-center p-3 md:p-4">
          No languages to show yet! Looks like your profile doesn&apos;t have any public repos with code. Once you share
          some, we&apos;ll chart your top languages here.
        </div>
      );
    }

    return <BarChartLanguages languages={languages} className="px-3 md:px-4" />;
  };

  const getTooltip = () => (
    <AdaptiveTooltip trigger={<InfoIcon size={20} />}>
      <div className="max-w-80 text-sm">
        <div>
          Each of your repos has stars and a language breakdown. We calculate language stars by multiplying the
          repo&apos;s stars by the share of a language in that repo.
        </div>
        <div className="mt-1">
          <b>Example:</b> A repo with 100 stars that&apos;s 60% JavaScript gives JavaScript 60 stars.
        </div>
        <div className="mt-1">
          We do this for all your public repos, add them up, and rank your languages by their total stars.
        </div>
      </div>
    </AdaptiveTooltip>
  );

  return (
    <ProfileCard className="gap-2 p-0 md:p-0">
      <ProfileCardHeader meta={getTooltip()} className="p-3 md:p-4 pb-0 md:pb-0">
        Top 3 Languages By Stars
      </ProfileCardHeader>
      {getCardContent()}
      <Link
        href={`/profile/${login}/languages`}
        className="h-12 flex items-center justify-end px-3 border-t border-muted"
      >
        All Languages <FiArrowRight />
      </Link>
    </ProfileCard>
  );
};
