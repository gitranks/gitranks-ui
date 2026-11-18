import type { FC, ReactNode } from 'react';

import { LinkToProfile } from '../link-to-profile/link-to-profile';
import {
  developerRankingOptions,
  type RankingOption,
  RankingTypeSwitcher,
} from '../rank-type-switcher/ranking-type-switcher';
import type { RankingTypeClient } from '@/types/ranking.types';
import { getRankingTitle } from '@/utils/get-ranking-title';

type RankingHeaderSectionProps = {
  title: string;
  /** A mark beside the title, such as a "Beta" pill. */
  pill?: ReactNode;
  /** The orders the ranking can be shown in. */
  options: readonly RankingOption[];
  /** The words before the orders; the switcher's own when unset. */
  optionsLabel?: string;
  /** What the rank is based on, with a link after it. */
  subtitle: ReactNode;
};

/** A ranking's title, its "Rank by" switch, and the line on what the rank is based on. */
export const RankingHeaderSection: FC<RankingHeaderSectionProps> = ({
  title,
  pill,
  options,
  optionsLabel,
  subtitle,
}) => (
  <>
    <div className="flex items-center justify-between gap-4 flex-wrap">
      {pill ? (
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {pill}
        </div>
      ) : (
        <h1 className="text-2xl font-semibold">{title}</h1>
      )}

      <div className="flex gap-4">
        <RankingTypeSwitcher options={options} label={optionsLabel} />
      </div>
    </div>

    <div className="text-sm text-muted-foreground">{subtitle}</div>
  </>
);

type DeveloperRankingHeaderSectionProps = {
  rankingType: RankingTypeClient;
  countryName?: string;
};

/** The header of a developer ranking, worldwide or in one country. */
export const DeveloperRankingHeaderSection: FC<DeveloperRankingHeaderSectionProps> = ({ rankingType, countryName }) => {
  const [title, subtitle] = getRankingTitle(rankingType, countryName);

  return (
    <RankingHeaderSection
      title={title}
      options={developerRankingOptions(rankingType, countryName ? `/country/${countryName}` : `/by`)}
      subtitle={
        <>
          {subtitle} <LinkToProfile />
        </>
      }
    />
  );
};
