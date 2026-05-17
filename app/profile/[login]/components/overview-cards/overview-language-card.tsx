import { InfoIcon } from 'lucide-react';
import type { FC } from 'react';
import { FiArrowRight } from 'react-icons/fi';

import { ProfileCard, ProfileCardHeader } from '../profile-card';
import { AdaptiveTooltip } from '@/components/adaptive-tooltip/adaptive-tooltip';
import BarChartLanguages from '@/components/chart-languages/bar-chart-languages';
import { Link } from '@/components/link/link';
import type { PageProfileOverviewQuery } from '@/types/generated/graphql';

type ProfileLanguageCardProps = {
  login: string;
  languages?: NonNullable<PageProfileOverviewQuery['user']>['sLangs'];
};

export const ProfileLanguageCard: FC<ProfileLanguageCardProps> = ({ login, languages }) => {
  const getCardContent = () => {
    if (!languages?.length) {
      return (
        <div className="flex grow items-center p-3 md:p-4">
          No languages to show yet. This profile has no public repos with code. Once there are some, we&apos;ll show
          their top languages here.
        </div>
      );
    }

    return <BarChartLanguages languages={languages.slice(0, 3)} className="px-3 md:px-4" />;
  };

  const getTooltip = () => (
    <AdaptiveTooltip trigger={<InfoIcon size={20} />}>
      <div className="max-w-80 text-sm">
        <div>
          Each repo has stars and a language breakdown. We get &quot;language stars&quot; by multiplying the repo&apos;s
          stars by that language&apos;s share in the repo.
        </div>
        <div className="mt-1">
          <b>Example:</b> A repo with 100 stars that&apos;s 60% JavaScript gives JavaScript 60 stars.
        </div>
        <div className="mt-1">We do this for all public repos, sum the totals, and rank languages by total stars.</div>
      </div>
    </AdaptiveTooltip>
  );

  return (
    <ProfileCard className="gap-2 p-0 md:p-0">
      <ProfileCardHeader meta={getTooltip()} className="p-3 md:p-4 pb-0 md:pb-0">
        Top 3 Languages by Stars
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
