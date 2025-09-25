import type { FC } from 'react';

import { TIER_NAMES } from '@/app/app.consts';
import { PersonaChart } from '@/components/persona-chart/persona-chart';
import { RankChart } from '@/components/rank-chart/rank-chart';
import type { Tier } from '@/types/generated/graphql';
import type { BestTierResult } from '@/utils/calculate-tiers/calculate-tiers.types';
import { getPersonaType } from '@/utils/get-persona-type';
import { ProfileCardsGrid } from '../../components/profile-card';
import { GlobalRankTooltip, PersonaTooltip } from '../../components/tooltips';
import { ProfileChartCard, ProfileChartDataSlot, ProfileChartSlot } from './profile-chart-card';

type ProfileChartsProps = {
  rankChartTitle: string;
  sTier?: Tier;
  cTier?: Tier;
  fTier?: Tier;
  bestTier?: BestTierResult | null;
};

export const ProfileRankCharts: FC<ProfileChartsProps> = ({ rankChartTitle, sTier, cTier, fTier, bestTier }) => {
  if (!bestTier?.data?.tier) {
    return null;
  }

  return (
    <ProfileCardsGrid>
      <ProfileChartCard>
        <ProfileChartSlot>
          <RankChart progress={bestTier.data} />
        </ProfileChartSlot>
        <ProfileChartDataSlot
          tooltip={<GlobalRankTooltip />}
          title={rankChartTitle}
          value={`${TIER_NAMES[bestTier?.data?.tier - 1]} ${bestTier?.data?.level}`}
        />
      </ProfileChartCard>
      <ProfileChartCard>
        <ProfileChartSlot>
          <PersonaChart sTier={sTier} cTier={cTier} fTier={fTier} />
        </ProfileChartSlot>
        <ProfileChartDataSlot tooltip={<PersonaTooltip />} title="Persona" value={getPersonaType(bestTier.source)} />
      </ProfileChartCard>
    </ProfileCardsGrid>
  );
};
