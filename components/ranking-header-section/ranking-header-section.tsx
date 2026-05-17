import type { FC } from 'react';

import { LinkToProfile } from '../link-to-profile/link-to-profile';
import { RankingTypeSwitcher } from '../rank-type-switcher/ranking-type-switcher';
import type { RankingTypeClient } from '@/types/ranking.types';
import { getRankingTitle } from '@/utils/get-ranking-title';

type RankingHeaderSectionProps = {
  rankingType: RankingTypeClient;
  countryName?: string;
};

export const RankingHeaderSection: FC<RankingHeaderSectionProps> = ({ rankingType, countryName }) => {
  const [title, subtitle] = getRankingTitle(rankingType, countryName);

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-semibold">{title}</h1>

        <div className="flex gap-4">
          <RankingTypeSwitcher rankingType={rankingType} urlPrefix={countryName ? `/country/${countryName}` : `/by`} />
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {subtitle} <LinkToProfile />
      </div>
    </>
  );
};
