import { InfoIcon } from 'lucide-react';
import type { FC } from 'react';

import { MoreLink, ProfileCard, ProfileCardHeader } from '../profile-card';
import { AdaptiveTooltip } from '@/components/adaptive-tooltip/adaptive-tooltip';
import BarChartLanguages from '@/components/chart-languages/bar-chart-languages';
import type { PageProfileOverviewQuery } from '@/types/generated/graphql';

type ProfileLanguageCardProps = {
  login: string;
  languages?: NonNullable<PageProfileOverviewQuery['user']>['sLangs'];
};

export const ProfileLanguageCard: FC<ProfileLanguageCardProps> = ({ login, languages }) => {
  const getCardContent = () => {
    if (!languages?.length) {
      return (
        <p className="grow px-4 text-sm text-muted-foreground">
          No languages to show yet. This profile has no public repos with code. Once there are some, we&apos;ll show
          their top languages here.
        </p>
      );
    }

    return <BarChartLanguages languages={languages.slice(0, 3)} className="px-4" />;
  };

  const getTooltip = () => (
    <AdaptiveTooltip
      trigger={
        <button type="button" aria-label="How language stars are counted" className="text-muted-foreground">
          <InfoIcon className="size-4" />
        </button>
      }
    >
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
    <ProfileCard className="gap-3 p-0 overflow-hidden">
      <ProfileCardHeader meta={getTooltip()} className="px-4 pt-4">
        Top 3 languages by stars
      </ProfileCardHeader>
      {getCardContent()}
      <div className="mt-auto flex justify-end border-t px-4 py-3">
        <MoreLink href={`/profile/${login}/languages`}>All languages</MoreLink>
      </div>
    </ProfileCard>
  );
};
